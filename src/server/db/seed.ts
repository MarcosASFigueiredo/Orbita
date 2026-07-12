// Lagash VTT — LOCAL/DEV seed. Populates a fresh local database with everything
// you need to develop and log in offline:
//   - the 5 characters (Halda = reference content, the rest are pt-BR
//     placeholders) + their Atrito GM notes
//   - the Six Suns singleton (all lit) and one example Legacy entry
//   - two allowlisted test users you can sign in as (see below)
//
// This is DEV-ONLY. Staging/production are seeded no more — real players are
// added by the GM from the in-app invite UI, and the environments are frozen
// (see the campaign go-live). To prevent a repeat of seed data leaking into
// Neon, this script HARD-REFUSES to run unless DATABASE_URL is the local docker
// DB. Run it with `pnpm db:seed` (or the full `pnpm dev:setup`).
//
// Login flow locally: request a magic link on /login; with no RESEND_API_KEY the
// server prints the link to the terminal (see src/lib/mail.ts) — paste it in the
// browser to sign in. On first login Auth.js provisions role + character from
// the matching allowlist row below.
//
// Standalone script: builds its own Neon/Drizzle connection instead of the
// server-only client, so it can run under plain tsx.
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import {
  characterGmNotes,
  characters,
  invitedUsers,
  legacyEntries,
  sixSunsState,
} from './schema'
import { configureNeonForLocalDev } from './neon-local'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

// Local-only guard: refuse to seed anything that isn't the local docker DB, so a
// stray `pnpm db:seed` can never write fixtures into Neon/staging/production.
if (!connectionString.includes('db.localtest.me')) {
  throw new Error(
    'db:seed is local-only. DATABASE_URL must point at the local docker DB ' +
      '(db.localtest.me). Aborting to avoid writing seed data to a remote env.',
  )
}

// Redirects the neon-http driver to the local docker proxy on :4444.
configureNeonForLocalDev(connectionString)
const db = drizzle(neon(connectionString), {
  schema: {
    characterGmNotes,
    characters,
    invitedUsers,
    legacyEntries,
    sixSunsState,
  },
})

// Characters: Halda = fully specified reference; others = pt-BR placeholders
// to be replaced with real content the GM provides.
const SEED_CHARACTERS = [
  {
    slug: 'halda',
    nome: 'Halda',
    ocupacao: 'Astrônoma',
    epigrafe: 'O céu acabou de mentir para você.',
    descricao:
      'Você passou a vida medindo o céu — e é uma das poucas mentes em Lagash capaz de entender o que um número impossível significa. Você lê placas fotográficas, calcula órbitas, enxerga o padrão onde os outros só veem luz.',
    vinculo:
      'A verdade. Os dados, a prova, o mecanismo. Não as pessoas, não os prédios — o saber. E você sabe, no fundo, que trocaria vidas por isso.',
    gancho:
      'A leitura estranha é sua: um instrumento seu registrou, ontem, um valor que não deveria existir. A coceira que não larga a sua cabeça.',
    medo: 'Estar certa.',
    querDoGrupo: 'Que levem os dados a sério antes que seja tarde.',
    temePerder: 'A razão — porque compreender isto por inteiro pode ser insuportável.',
    position: 0,
    atrito:
      'Empurra para publicar/preservar a qualquer custo; sobe rápido no Insight quando confrontada com dados que confirmam o impensável.',
  },
  ...(
    [
      ['vessa', 'Vessa', 'Repórter', 1],
      ['sehra', 'Sehra', 'Arquivista', 2],
      ['orren', 'Orren', 'Clérigo das Seis', 3],
      ['corvin', 'Corvin', 'Oficial da Guarda', 4],
    ] as const
  ).map(([slug, nome, ocupacao, position]) => ({
    slug,
    nome,
    ocupacao,
    epigrafe: '[Epígrafe a definir]',
    descricao:
      '[Descrição a definir — placeholder até o GM fornecer o texto real.]',
    vinculo: '[Vínculo a definir.]',
    gancho: '[Gancho a definir.]',
    medo: '[Medo a definir.]',
    querDoGrupo: '[O que quer do grupo — a definir.]',
    temePerder: '[O que teme perder — a definir.]',
    position,
    atrito: '[Atrito a definir — nota de preparação do GM.]',
  })),
]

// Allowlisted local test users. The GM has no characterSlug; the player is bound
// to the seeded "halda" character. These @lagash.local emails are dev-only and
// never leave local, so they can't leak into a real allowlist.
const DEV_INVITES: Array<typeof invitedUsers.$inferInsert> = [
  { email: 'gm@lagash.local', role: 'gm', displayName: 'Mestre (dev)' },
  { email: 'player@lagash.local', role: 'player', characterSlug: 'halda', displayName: 'Halda (dev)' },
]

async function seed() {
  for (const { atrito, ...c } of SEED_CHARACTERS) {
    const [row] = await db
      .insert(characters)
      .values(c)
      .onConflictDoNothing({ target: characters.slug })
      .returning({ id: characters.id })

    // onConflictDoNothing returns nothing when the row already exists — look it
    // up so the Atrito note still gets seeded on a fresh row.
    const characterId =
      row?.id ??
      (
        await db.query.characters.findFirst({
          where: (t, { eq }) => eq(t.slug, c.slug),
          columns: { id: true },
        })
      )?.id
    if (characterId) {
      await db
        .insert(characterGmNotes)
        .values({ characterId, atrito })
        .onConflictDoNothing({ target: characterGmNotes.characterId })
    }
  }

  // Six Suns — singleton row, all six lit at campaign start.
  await db.insert(sixSunsState).values({ id: true }).onConflictDoNothing()

  // Legacy Track — one example entry so the list renders. Only if empty.
  const existing = await db
    .select({ n: sql<number>`count(*)` })
    .from(legacyEntries)
  if (Number(existing[0]?.n ?? 0) === 0) {
    await db.insert(legacyEntries).values({
      texto: 'A prova existe, e está escondida.',
      status: 'secured',
      position: 0,
    })
  }

  // Local allowlist test users.
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

  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
