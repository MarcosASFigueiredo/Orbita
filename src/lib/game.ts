// Framework-neutral domain types + constants for the Lagash game model.
// These are the shapes the UI and server functions speak (snake_case, with
// timestamps as ISO strings) — the stable API/DTO contract, deliberately
// decoupled from the Drizzle row shape so the DB layer can change underneath
// without touching components. `src/server/data.ts` maps Drizzle rows to these.
//
// The server maps Drizzle rows (`src/server/db/schema.ts`) to these DTOs in
// `src/server/data.core.ts`.

export type AppRole = 'gm' | 'player'
export type LegacyStatus = 'secured' | 'threatened' | 'lost'

/** Editable public sheet fields (pt-BR). Excludes system + GM-only columns. */
export type CharacterSheetFields = {
  nome: string
  ocupacao: string
  epigrafe: string
  descricao: string
  vinculo: string
  gancho: string
  medo: string
  quer_do_grupo: string
  teme_perder: string
}

export type CharacterRow = CharacterSheetFields & {
  id: string
  slug: string
  owner_user_id: string | null
  insight: number
  insight_locked_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export type LegacyEntryRow = {
  id: string
  texto: string
  status: LegacyStatus
  position: number
  created_at: string
  updated_at: string
}

/** Number of suns in the Six Suns track. */
export const SUN_COUNT = 6
/** Insight track bounds. */
export const INSIGHT_MIN = 0
export const INSIGHT_MAX = 6
