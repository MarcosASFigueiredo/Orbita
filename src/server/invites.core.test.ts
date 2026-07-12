import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '#/server/session'

// The invite cores pull in the server-only DB client + auth config transitively
// (via session.ts). Stub those leaf modules so the REAL session.ts — and thus
// the real assertGm guard we're testing — loads in a plain node env. The db is
// a chainable no-op: awaiting any query resolves to []. Authorization is checked
// before any query runs, so a rejected player never touches these stubs.
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/server/auth/config', () => ({ authSession: async () => null }))
vi.mock('#/server/db/client', () => {
  const chain = (): unknown => {
    const p = Promise.resolve([] as unknown[])
    return new Proxy(function () {} as object, {
      get(_t, prop) {
        if (prop === 'then') return p.then.bind(p)
        if (prop === 'catch') return p.catch.bind(p)
        if (prop === 'finally') return p.finally.bind(p)
        return () => chain()
      },
      apply: () => chain(),
    })
  }
  return {
    db: { select: chain, insert: chain, update: chain, delete: chain },
    schema: {},
  }
})

const { createInvite, listInvites, normalizeEmail, resendInvite, revokeInvite } =
  await import('#/server/invites.core')

const gm: AuthUser = {
  id: 'gm-1',
  email: 'mestre@orbitasuns.test',
  role: 'gm',
  displayName: 'Mestre',
  characterSlug: null,
}
const player: AuthUser = {
  id: 'p-1',
  email: 'jogadora@orbitasuns.test',
  role: 'player',
  displayName: 'Jogadora',
  characterSlug: 'halda',
}

describe('invite authorization', () => {
  it('rejects a player creating an invite', async () => {
    await expect(
      createInvite(player, { email: 'x@y.com', displayName: 'X' }),
    ).rejects.toThrow(/GM only/)
  })

  it('rejects a player resending an invite', async () => {
    await expect(resendInvite(player, { email: 'x@y.com' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player revoking an invite', async () => {
    await expect(revokeInvite(player, { email: 'x@y.com' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player listing invites', async () => {
    await expect(listInvites(player)).rejects.toThrow(/GM only/)
  })
})

describe('invite validation', () => {
  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  Mestre@Orbitasuns.TEST ')).toBe('mestre@orbitasuns.test')
  })

  it('rejects a malformed email without touching the db', async () => {
    const res = await createInvite(gm, { email: 'not-an-email' })
    expect(res).toEqual({ ok: false, error: 'invalid_email' })
  })

  it('accepts a valid invite from the GM', async () => {
    const res = await createInvite(gm, {
      email: 'Nova@Orbitasuns.test',
      displayName: 'Nova',
    })
    expect(res).toEqual({ ok: true, error: null })
  })
})
