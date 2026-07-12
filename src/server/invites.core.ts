// Server-only core for the player-invite flow. The `invited_users` table is
// both the allowlist (consulted by the Auth.js sign-in gate) AND the invite
// registry the GM manages here — one source of truth, no second table.
//
// Invite *status* is derived, never stored: an invite is "accepted" once a
// `users` row exists for that email (first sign-in created the account via the
// Auth.js createUser event). This can't drift out of sync with reality.
//
// All mutations are GM-only (assertGm), same as the track/Atrito mutations.
import '@tanstack/react-start/server-only'

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '#/server/db/client'
import {
  characters,
  invitedUsers,
  users,
  verificationTokens,
} from '#/server/db/schema'
import { assertGm } from '#/server/session'
import type { AuthUser } from '#/server/session'
import type { InviteRow } from '#/lib/game'
import type { MutationResult } from '#/server/data.core'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Normalize an email for storage/lookup: trimmed + lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// GM-only: every invite, with derived status + the PC (if any) assigned to the
// accepted user. Pending = no account yet; accepted = a users row exists.
export async function listInvites(user: AuthUser): Promise<InviteRow[]> {
  assertGm(user)
  const rows = await db
    .select({
      email: invitedUsers.email,
      displayName: invitedUsers.displayName,
      role: invitedUsers.role,
      createdAt: invitedUsers.createdAt,
      userId: users.id,
    })
    .from(invitedUsers)
    .leftJoin(
      users,
      eq(sql`lower(${users.email})`, sql`lower(${invitedUsers.email})`),
    )
    .orderBy(asc(invitedUsers.createdAt))

  // Resolve the assigned PC for accepted users in one extra query.
  const acceptedIds = rows.map((r) => r.userId).filter((id): id is string => !!id)
  const assigned = new Map<string, { id: string; nome: string }>()
  if (acceptedIds.length > 0) {
    const chars = await db
      .select({
        id: characters.id,
        nome: characters.nome,
        ownerUserId: characters.ownerUserId,
      })
      .from(characters)
      .where(
        and(
          inArray(characters.ownerUserId, acceptedIds),
          isNull(characters.deletedAt),
        ),
      )
    for (const c of chars) {
      if (c.ownerUserId) assigned.set(c.ownerUserId, { id: c.id, nome: c.nome })
    }
  }

  return rows.map((r) => ({
    email: r.email,
    display_name: r.displayName,
    role: r.role,
    status: r.userId ? 'accepted' : 'pending',
    user_id: r.userId,
    assigned_character: r.userId ? (assigned.get(r.userId) ?? null) : null,
    created_at: r.createdAt.toISOString(),
  }))
}

// GM-only: register an invite (the allowlist row). The client fires the magic
// link separately (reusing the Auth.js/Resend path) once this resolves ok.
export async function createInvite(
  user: AuthUser,
  input: { email: string; displayName?: string },
): Promise<MutationResult> {
  assertGm(user)
  const email = normalizeEmail(input.email)
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'invalid_email' }
  const displayName = (input.displayName ?? '').trim()
  await db
    .insert(invitedUsers)
    .values({ email, role: 'player', displayName })
    .onConflictDoUpdate({
      target: invitedUsers.email,
      // Only refresh the display name; never downgrade an existing role.
      set: { displayName },
    })
  return { ok: true, error: null }
}

// GM-only: invalidate any outstanding magic links for this email so only the
// next one works (the client then re-fires the sign-in to mint a fresh link).
export async function resendInvite(
  user: AuthUser,
  input: { email: string },
): Promise<MutationResult> {
  assertGm(user)
  const email = normalizeEmail(input.email)
  const invite = await db
    .select({ email: invitedUsers.email })
    .from(invitedUsers)
    .where(eq(sql`lower(${invitedUsers.email})`, email))
    .limit(1)
  if (!invite.length) return { ok: false, error: 'not_found' }
  await db
    .delete(verificationTokens)
    .where(eq(sql`lower(${verificationTokens.identifier})`, email))
  return { ok: true, error: null }
}

// GM-only: cancel a still-pending invite entirely (no trace left). Refuses once
// the invite is accepted — removing a live account is a different, riskier op
// that stays out of scope here.
export async function revokeInvite(
  user: AuthUser,
  input: { email: string },
): Promise<MutationResult> {
  assertGm(user)
  const email = normalizeEmail(input.email)
  const account = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1)
  if (account.length) return { ok: false, error: 'already_accepted' }
  await db
    .delete(verificationTokens)
    .where(eq(sql`lower(${verificationTokens.identifier})`, email))
  await db
    .delete(invitedUsers)
    .where(eq(sql`lower(${invitedUsers.email})`, email))
  return { ok: true, error: null }
}
