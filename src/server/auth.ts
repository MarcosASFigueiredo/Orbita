import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '#/server/session'
import type { AuthUser } from '#/server/session'

export type { AuthUser }

// Read the current user (identity + role + owned character), or null when not
// signed in. Used by route guards. Sign-in / magic-link callback / sign-out are
// handled by the Auth.js HTTP endpoints mounted in src/start.ts, not here.
export const fetchCurrentUser = createServerFn({ method: 'GET' }).handler(
  (): Promise<AuthUser | null> => getCurrentUser(),
)
