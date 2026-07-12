// Identity seam. Every server function resolves "who is calling" through here,
// so the rest of the app never talks to the auth provider directly.
//
// Backed by Auth.js: read the session (user id) from the request, then resolve
// role + owned character from Neon. `requireUser` / `requireGm` are what the
// data layer calls.
import "@tanstack/react-start/server-only";

import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/server/db/client";
import { characters, users } from "#/server/db/schema";
import { authSession } from "#/server/auth/config";
import type { AppRole } from "#/lib/game";

// The authenticated user as the app cares about it: identity + role + which PC
// they control (null for the GM or a not-yet-provisioned login).
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  displayName: string;
  characterSlug: string | null;
}

// Resolve the current user from the request session. Returns null when not
// logged in (or before AUTH_SECRET is configured — the app then degrades to the
// login screen instead of throwing).
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!process.env.AUTH_SECRET) return null;
  const session = await authSession(getRequest());
  const userId = session?.user?.id;
  if (!userId) return null;

  // One query resolves role (from users) + owned character slug (left join).
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
      slug: characters.slug,
    })
    .from(users)
    .leftJoin(
      characters,
      and(eq(characters.ownerUserId, users.id), isNull(characters.deletedAt)),
    )
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.name ?? "",
    characterSlug: row.slug ?? null,
  };
}

// Require an authenticated, provisioned user; otherwise bounce to /login.
// Mirrors the old RLS "authenticated" gate — no session, no data.
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw redirect({ to: "/login", search: { erro: undefined } });
  }
  return user;
}

// Require the GM. Replaces the DB-side is_gm() checks that guarded GM-only
// tables/columns under RLS.
export async function requireGm(): Promise<AuthUser> {
  const user = await requireUser();
  assertGm(user);
  return user;
}

/** Throws when a non-GM reaches a GM-only path. Used inside data-layer cores. */
export function assertGm(user: AuthUser): void {
  if (user.role !== "gm") {
    throw new Error("forbidden: GM only");
  }
}
