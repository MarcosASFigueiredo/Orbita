import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '#/server/session'

// Same leaf-module stubs as invites.core.test: load the real session.ts (real
// assertGm) without pulling a live DB or auth provider. Authorization is checked
// before any query, so a rejected player never reaches the db stub.
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

const {
  archiveCharacter,
  assignCharacter,
  createCharacter,
  getGmDashboard,
  restoreCharacter,
  saveCharacterFields,
  setInsight,
} = await import('#/server/data.core')

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

describe('character/dashboard authorization', () => {
  it('rejects a player creating a character', async () => {
    await expect(createCharacter(player, { nome: 'Nova' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player reading the GM dashboard', async () => {
    await expect(getGmDashboard(player)).rejects.toThrow(/GM only/)
  })

  it('rejects a player assigning a character', async () => {
    await expect(
      assignCharacter(player, { characterId: 'c1', userId: 'p-1' }),
    ).rejects.toThrow(/GM only/)
  })

  it('rejects a player archiving a character', async () => {
    await expect(archiveCharacter(player, { id: 'c1' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player restoring a character', async () => {
    await expect(restoreCharacter(player, { id: 'c1' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player setting Insight (GM controls sheets now)', async () => {
    await expect(
      setInsight(player, { id: 'c1', insight: 3 }),
    ).rejects.toThrow(/GM only/)
  })

  it('rejects a player editing sheet fields (GM controls sheets now)', async () => {
    await expect(
      saveCharacterFields(player, { id: 'c1', fields: { nome: 'X' } }),
    ).rejects.toThrow(/GM only/)
  })
})

describe('character creation validation', () => {
  it('requires a non-empty name (no db touched)', async () => {
    const res = await createCharacter(gm, { nome: '   ' })
    expect(res).toEqual({ ok: false, error: 'nome_required', character: null })
  })
})
