// Server-fn wrappers: resolve the caller via the session seam, then delegate to
// the server-only cores in data.core.ts. The core import is used only inside
// handler bodies, so it (and the Neon client) is stripped from the client
// bundle — the routes import these RPC endpoints, not the DB.
import { createServerFn } from '@tanstack/react-start'
import { requireGm, requireUser } from '#/server/session'
import {
  archiveCharacter,
  assignCharacter,
  createCharacter,
  createLegacyEntry,
  editLegacyEntry,
  getGmDashboard,
  getPlayerHome,
  removeLegacyEntry,
  restoreCharacter,
  saveAtrito,
  saveCharacterFields,
  setCharacterLock,
  setInsight,
  writeSuns,
} from '#/server/data.core'
import {
  createInvite,
  resendInvite,
  revokeInvite,
} from '#/server/invites.core'
import {
  archiveNpc,
  createNpc,
  editNpc,
  restoreNpc,
} from '#/server/npcs.core'
import type { CharacterSheetFields, LegacyStatus, NpcFields } from '#/lib/game'

export type { PlayerHomeData, GmDashboardData } from '#/server/data.core'

// ---- Aggregated reads ------------------------------------------------------

export const fetchPlayerHome = createServerFn({ method: 'GET' }).handler(
  async () => getPlayerHome(await requireUser()),
)

export const fetchGmDashboard = createServerFn({ method: 'GET' }).handler(
  async () => getGmDashboard(await requireUser()),
)

// ---- Mutations -------------------------------------------------------------

export const createCharacterSheet = createServerFn({ method: 'POST' })
  .validator((input: { nome: string }) => input)
  .handler(async ({ data }) => createCharacter(await requireGm(), data))

export const assignCharacterOwner = createServerFn({ method: 'POST' })
  .validator((input: { characterId: string; userId: string | null }) => input)
  .handler(async ({ data }) => assignCharacter(await requireGm(), data))

export const archiveCharacterSheet = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => archiveCharacter(await requireGm(), data))

export const restoreCharacterSheet = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => restoreCharacter(await requireGm(), data))

export const updateCharacterFields = createServerFn({ method: 'POST' })
  .validator((input: { id: string; fields: Partial<CharacterSheetFields> }) => input)
  .handler(async ({ data }) => saveCharacterFields(await requireGm(), data))

export const updateInsight = createServerFn({ method: 'POST' })
  .validator((input: { id: string; insight: number }) => input)
  .handler(async ({ data }) => setInsight(await requireGm(), data))

export const lockCharacter = createServerFn({ method: 'POST' })
  .validator((input: { id: string; locked: boolean }) => input)
  .handler(async ({ data }) => setCharacterLock(await requireGm(), data))

export const updateAtrito = createServerFn({ method: 'POST' })
  .validator((input: { characterId: string; atrito: string }) => input)
  .handler(async ({ data }) => saveAtrito(await requireGm(), data))

export const setSuns = createServerFn({ method: 'POST' })
  .validator((input: { suns: boolean[] }) => input)
  .handler(async ({ data }) => writeSuns(await requireGm(), data))

export const addLegacyEntry = createServerFn({ method: 'POST' })
  .validator((input: { texto: string; status?: LegacyStatus; position?: number }) => input)
  .handler(async ({ data }) => createLegacyEntry(await requireGm(), data))

export const updateLegacyEntry = createServerFn({ method: 'POST' })
  .validator((input: { id: string; texto?: string; status?: LegacyStatus }) => input)
  .handler(async ({ data }) => editLegacyEntry(await requireGm(), data))

export const deleteLegacyEntry = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => removeLegacyEntry(await requireGm(), data))

// ---- Invites (GM-only) -----------------------------------------------------

export const invitePlayer = createServerFn({ method: 'POST' })
  .validator((input: { email: string; displayName?: string }) => input)
  .handler(async ({ data }) => createInvite(await requireGm(), data))

export const resendPlayerInvite = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => resendInvite(await requireGm(), data))

export const revokePlayerInvite = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => revokeInvite(await requireGm(), data))

// ---- NPCs (GM-only) --------------------------------------------------------

export const createNpcSheet = createServerFn({ method: 'POST' })
  .validator((input: Partial<NpcFields> & { nome: string }) => input)
  .handler(async ({ data }) => createNpc(await requireGm(), data))

export const updateNpc = createServerFn({ method: 'POST' })
  .validator((input: { id: string; fields: Partial<NpcFields> }) => input)
  .handler(async ({ data }) => editNpc(await requireGm(), data))

export const archiveNpcSheet = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => archiveNpc(await requireGm(), data))

export const restoreNpcSheet = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => restoreNpc(await requireGm(), data))
