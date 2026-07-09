// Server-fn wrappers: resolve the caller via the session seam, then delegate to
// the server-only cores in data.core.ts. The core import is used only inside
// handler bodies, so it (and the Neon client) is stripped from the client
// bundle — the routes import these RPC endpoints, not the DB.
import { createServerFn } from '@tanstack/react-start'
import { requireGm, requireUser } from '#/server/session'
import {
  createLegacyEntry,
  editLegacyEntry,
  getGmDashboard,
  getPlayerHome,
  removeLegacyEntry,
  saveAtrito,
  saveCharacterFields,
  setCharacterLock,
  setInsight,
  writeSuns,
} from '#/server/data.core'
import type { CharacterSheetFields, LegacyStatus } from '#/lib/game'

export type { PlayerHomeData, GmDashboardData } from '#/server/data.core'

// ---- Aggregated reads ------------------------------------------------------

export const fetchPlayerHome = createServerFn({ method: 'GET' }).handler(
  async () => getPlayerHome(await requireUser()),
)

export const fetchGmDashboard = createServerFn({ method: 'GET' }).handler(
  async () => getGmDashboard(await requireUser()),
)

// ---- Mutations -------------------------------------------------------------

export const updateCharacterFields = createServerFn({ method: 'POST' })
  .validator((input: { id: string; fields: Partial<CharacterSheetFields> }) => input)
  .handler(async ({ data }) => saveCharacterFields(await requireUser(), data))

export const updateInsight = createServerFn({ method: 'POST' })
  .validator((input: { id: string; insight: number }) => input)
  .handler(async ({ data }) => setInsight(await requireUser(), data))

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
