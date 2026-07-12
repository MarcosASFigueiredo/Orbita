// Auth.js (@auth/core) configuration — self-hosted magic-link auth against our
// Neon DB. There is no official TanStack Start adapter, so the HTTP handler is
// mounted as a global request middleware in src/start.ts, and the server-side
// session is read via the generic `authSession()` helper below.
import '@tanstack/react-start/server-only'

import { Auth, createActionURL } from '@auth/core'
import type { AuthConfig } from '@auth/core'
import Resend from '@auth/core/providers/resend'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/server/db/client'
import {
  accounts,
  characters,
  invitedUsers,
  sessions,
  users,
  verificationTokens,
} from '#/server/db/schema'
import { sendMagicLinkEmail } from '#/lib/mail'

// The GM's allowlist row for an email (case-insensitive), or undefined.
async function findInvite(email: string) {
  const rows = await db
    .select()
    .from(invitedUsers)
    .where(eq(sql`lower(${invitedUsers.email})`, email.toLowerCase()))
    .limit(1)
  return rows[0]
}

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // @auth/core defaults basePath to /auth; we mount at /api/auth (matching the
  // middleware guard and the client fetch URLs).
  basePath: '/api/auth',
  session: { strategy: 'database' },
  secret: process.env.AUTH_SECRET,
  // On Vercel the app sits behind a proxy; trust the forwarded host header.
  trustHost: true,
  providers: [
    Resend({
      // apiKey is required by the provider type but unused: our overridden
      // sendVerificationRequest routes through the swappable lib/mail.ts.
      apiKey: process.env.RESEND_API_KEY ?? 'unused',
      from: process.env.EMAIL_FROM ?? 'Orbita Suns <onboarding@resend.dev>',
      async sendVerificationRequest({ identifier, url, provider }) {
        // Allowlist gate, layer 1: never email a non-invited address. Return
        // silently (no error) so the allowlist can't be probed from the UI.
        if (!(await findInvite(identifier))) return
        await sendMagicLinkEmail({ to: identifier, url, from: provider.from })
      },
    }),
  ],
  // Every auth page routes back to our themed /login.
  pages: { signIn: '/login', verifyRequest: '/login', error: '/login' },
  callbacks: {
    // Allowlist gate, layer 2: only invited emails may complete sign-in. This
    // replaces the RLS "authenticated + on allowlist" assumption.
    async signIn({ user }) {
      if (!user.email) return false
      return Boolean(await findInvite(user.email))
    },
    // Database sessions omit the user id by default; expose it so the session
    // seam can resolve role + owned character.
    session({ session, user }) {
      if (session.user) (session.user as { id?: string }).id = user.id
      return session
    },
  },
  events: {
    // Provision role + character ownership from the allowlist on first sign-in.
    // Replaces the old handle_new_user() Postgres trigger.
    async createUser({ user }) {
      if (!user.email || !user.id) return
      const inv = await findInvite(user.email)
      if (!inv) return
      await db
        .update(users)
        .set({ role: inv.role, name: inv.displayName || user.name || '' })
        .where(eq(users.id, user.id))
      if (inv.role === 'player' && inv.characterSlug) {
        await db
          .update(characters)
          .set({ ownerUserId: user.id })
          .where(eq(characters.slug, inv.characterSlug))
      }
    },
  },
}

// Read the Auth.js session server-side (framework-agnostic pattern: call the
// core Auth handler against the session endpoint with the request's cookies).
// Returns the session JSON, or null when not signed in.
export async function authSession(
  request: Request,
): Promise<{ user?: { id?: string; email?: string; name?: string } } | null> {
  const protocol = new URL(request.url).protocol.replace(':', '')
  const url = createActionURL(
    'session',
    protocol,
    request.headers,
    process.env,
    '/api/auth',
  )
  const response = await Auth(
    new Request(url, { headers: { cookie: request.headers.get('cookie') ?? '' } }),
    authConfig,
  )
  const data = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || !Object.keys(data).length) return null
  return data as { user?: { id?: string } }
}
