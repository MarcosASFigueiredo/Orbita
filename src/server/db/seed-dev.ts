// Lagash VTT — LOCAL DEV allowlist seed (test users you can log in as offline).
//
// Kept separate from seed-invites.ts (your real table's emails) so test users
// never leak into production. Run by `pnpm dev:setup`, or on its own:
//   pnpm db:seed:dev     (needs the local DATABASE_URL in .env)
//
// Login flow locally: request a magic link on /login; with no RESEND_API_KEY the
// server prints the link to the terminal (see src/lib/mail.ts) — paste it in the
// browser to sign in. On first login Auth.js provisions role + character from
// the matching row below.
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { invitedUsers } from './schema'
import { configureNeonForLocalDev } from './neon-local'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

// Guard: refuse to seed test users into anything that isn't the local DB, so a
// stray `pnpm db:seed:dev` can never touch Neon/production.
if (!connectionString.includes('db.localtest.me')) {
  throw new Error(
    'db:seed:dev is local-only. DATABASE_URL must point at the local docker DB ' +
      '(db.localtest.me). Aborting to avoid writing test users to production.',
  )
}

configureNeonForLocalDev(connectionString)
const db = drizzle(neon(connectionString), { schema: { invitedUsers } })

// GM has no characterSlug; the player is bound to the seeded "halda" character.
const DEV_INVITES: Array<typeof invitedUsers.$inferInsert> = [
  { email: 'gm@lagash.local', role: 'gm', displayName: 'Mestre (dev)' },
  { email: 'player@lagash.local', role: 'player', characterSlug: 'halda', displayName: 'Halda (dev)' },
]

async function seedDev() {
  for (const inv of DEV_INVITES) {
    await db
      .insert(invitedUsers)
      .values(inv)
      .onConflictDoUpdate({
        target: invitedUsers.email,
        set: {
          role: inv.role ?? 'player',
          characterSlug: inv.characterSlug ?? null,
          displayName: inv.displayName ?? '',
        },
      })
    console.log(`  ✓ ${inv.email} (${inv.role}${inv.characterSlug ? ` → ${inv.characterSlug}` : ''})`)
  }
  console.log(`Seeded ${DEV_INVITES.length} dev test user(s).`)
}

seedDev().catch((err) => {
  console.error(err)
  process.exit(1)
})
