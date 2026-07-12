import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '#/server/session'

// Same leaf-module stubs as the other core tests: real session.ts (real
// assertGm), no live DB. Awaiting any query resolves to [].
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

const { archiveNpc, createNpc, editNpc, listNpcs, restoreNpc } = await import(
  '#/server/npcs.core'
)
const { getPlayerHome } = await import('#/server/data.core')

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

describe('npc authorization', () => {
  it('rejects a player listing NPCs', async () => {
    await expect(listNpcs(player)).rejects.toThrow(/GM only/)
  })

  it('rejects a player creating an NPC', async () => {
    await expect(createNpc(player, { nome: 'Reitor' })).rejects.toThrow(
      /GM only/,
    )
  })

  it('rejects a player editing an NPC', async () => {
    await expect(
      editNpc(player, { id: 'x', fields: { nome: 'X' } }),
    ).rejects.toThrow(/GM only/)
  })

  it('rejects a player archiving an NPC', async () => {
    await expect(archiveNpc(player, { id: 'x' })).rejects.toThrow(/GM only/)
  })

  it('rejects a player restoring an NPC', async () => {
    await expect(restoreNpc(player, { id: 'x' })).rejects.toThrow(/GM only/)
  })
})

describe('npc validation', () => {
  it('requires a name to create', async () => {
    const res = await createNpc(gm, { nome: '  ' })
    expect(res).toEqual({ ok: false, error: 'nome_required', npc: null })
  })
})

describe('npc isolation from players', () => {
  it('the Player home payload never carries NPCs', async () => {
    const home = await getPlayerHome(player)
    // Structural guarantee: NPCs are not part of the Player-facing contract.
    expect('npcs' in home).toBe(false)
    expect(Object.keys(home).sort()).toEqual(['character', 'legacy', 'suns'])
  })
})
