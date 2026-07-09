// Server-only data layer for Lagash. Holds the Neon/Drizzle access + the
// ported authorization logic. Kept separate from the createServerFn wrappers in
// `data.ts` so the Neon client never enters the client module graph: these
// cores are referenced ONLY inside server-fn handler bodies (which are stripped
// from the client bundle), and can be imported directly by tests.
import '@tanstack/react-start/server-only'

import { and, asc, eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '#/server/db/client'
import {
  characterGmNotes,
  characters,
  legacyEntries,
  sixSunsState,
} from '#/server/db/schema'
import { assertGm } from '#/server/session'
import type { AuthUser } from '#/server/session'
import { INSIGHT_MAX, INSIGHT_MIN, SUN_COUNT } from '#/lib/game'
import type {
  CharacterRow,
  CharacterSheetFields,
  LegacyEntryRow,
  LegacyStatus,
} from '#/lib/game'

// ---------------------------------------------------------------------------
// AUTHORIZATION NOTE
// Supabase RLS is gone; Neon+Drizzle has no row-level security. Every policy
// from the old 0001_init.sql is re-implemented here in app code:
//   - "player sees/edits only their own PC"  -> ownership check by slug
//   - "GM sees/does everything"              -> assertGm() / role branch
//   - "GM-only tables/columns" (Atrito, Six  -> assertGm() in the core
//      Suns, Legacy, insight_locked_at)         (+ requireGm in the wrapper)
//   - "everyone authenticated reads tracks"  -> requireUser() in the wrapper
// The cores take an explicit AuthUser so they can be unit-tested. Mutations
// return {ok:false} (0 rows affected) when the caller may not touch the target
// row — the RLS-equivalent silent denial.
// ---------------------------------------------------------------------------

// ---- Row mappers: Drizzle (camelCase, Date) -> DTO (snake_case, ISO) -------

type DbCharacter = InferSelectModel<typeof characters>
type DbLegacy = InferSelectModel<typeof legacyEntries>

function toCharacterRow(r: DbCharacter): CharacterRow {
  return {
    id: r.id,
    slug: r.slug,
    owner_user_id: r.ownerUserId,
    nome: r.nome,
    ocupacao: r.ocupacao,
    epigrafe: r.epigrafe,
    descricao: r.descricao,
    vinculo: r.vinculo,
    gancho: r.gancho,
    medo: r.medo,
    quer_do_grupo: r.querDoGrupo,
    teme_perder: r.temePerder,
    insight: r.insight,
    insight_locked_at: r.insightLockedAt?.toISOString() ?? null,
    position: r.position,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

function toLegacyRow(r: DbLegacy): LegacyEntryRow {
  return {
    id: r.id,
    texto: r.texto,
    status: r.status,
    position: r.position,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

function normalizeSuns(suns: boolean[] | null | undefined): boolean[] {
  return Array.from({ length: SUN_COUNT }, (_, i) => suns?.[i] ?? true)
}

async function readSharedTracks(): Promise<{
  suns: boolean[]
  legacy: LegacyEntryRow[]
}> {
  const [sunsRows, legacy] = await Promise.all([
    db.select({ suns: sixSunsState.suns }).from(sixSunsState).limit(1),
    db
      .select()
      .from(legacyEntries)
      .orderBy(asc(legacyEntries.position), asc(legacyEntries.createdAt)),
  ])
  return {
    suns: normalizeSuns(sunsRows[0]?.suns),
    legacy: legacy.map(toLegacyRow),
  }
}

// ---- Aggregated reads (used by route loaders for SSR) ----------------------

export interface PlayerHomeData {
  character: CharacterRow | null
  suns: boolean[]
  legacy: LegacyEntryRow[]
}

export interface GmDashboardData {
  characters: CharacterRow[]
  /** characterId -> Atrito text (GM-only). */
  atrito: Record<string, string>
  suns: boolean[]
  legacy: LegacyEntryRow[]
}

// Player's own sheet (scoped to their assigned character slug) + shared tracks.
export async function getPlayerHome(user: AuthUser): Promise<PlayerHomeData> {
  let character: CharacterRow | null = null
  if (user.characterSlug) {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.slug, user.characterSlug))
      .limit(1)
    character = rows[0] ? toCharacterRow(rows[0]) : null
  }
  return { character, ...(await readSharedTracks()) }
}

// Everything the GM dashboard needs. GM only — Atrito is never read otherwise.
export async function getGmDashboard(user: AuthUser): Promise<GmDashboardData> {
  assertGm(user)
  const [chars, notes, tracks] = await Promise.all([
    db.select().from(characters).orderBy(asc(characters.position)),
    db.select().from(characterGmNotes),
    readSharedTracks(),
  ])
  const atrito: Record<string, string> = {}
  for (const n of notes) atrito[n.characterId] = n.atrito
  return { characters: chars.map(toCharacterRow), atrito, ...tracks }
}

// ---- Mutations -------------------------------------------------------------

export type MutationResult = { ok: boolean; error: string | null }

const SHEET_KEYS: ReadonlyArray<keyof CharacterSheetFields> = [
  'nome',
  'ocupacao',
  'epigrafe',
  'descricao',
  'vinculo',
  'gancho',
  'medo',
  'quer_do_grupo',
  'teme_perder',
]

// DTO field -> Drizzle column key. Only these columns are ever writable via the
// sheet editor (whitelist; mirrors the old whitelist + column-guard trigger).
const SHEET_COLUMN = {
  nome: 'nome',
  ocupacao: 'ocupacao',
  epigrafe: 'epigrafe',
  descricao: 'descricao',
  vinculo: 'vinculo',
  gancho: 'gancho',
  medo: 'medo',
  quer_do_grupo: 'querDoGrupo',
  teme_perder: 'temePerder',
} as const satisfies Record<keyof CharacterSheetFields, keyof DbCharacter>

// A player may only touch their own PC (by slug); the GM may touch any (by id).
// Returns a WHERE that yields zero rows for an unauthorized target.
function ownedCharacter(user: AuthUser, id: string) {
  if (user.role === 'gm') return eq(characters.id, id)
  return and(
    eq(characters.id, id),
    eq(characters.slug, user.characterSlug ?? '\0'),
  )
}

// Save editable sheet text. Only whitelisted fields; only on an owned PC.
export async function saveCharacterFields(
  user: AuthUser,
  input: { id: string; fields: Partial<CharacterSheetFields> },
): Promise<MutationResult> {
  const patch: Partial<typeof characters.$inferInsert> = {}
  for (const key of SHEET_KEYS) {
    const value = input.fields[key]
    if (typeof value === 'string') {
      ;(patch as Record<string, string>)[SHEET_COLUMN[key]] = value
    }
  }
  if (Object.keys(patch).length === 0) return { ok: true, error: null }
  const res = await db
    .update(characters)
    .set(patch)
    .where(ownedCharacter(user, input.id))
    .returning({ id: characters.id })
  return { ok: res.length > 0, error: res.length ? null : 'not_authorized' }
}

// Set a character's Insight (clamped 0–6). Players may edit their own; GM any.
export async function setInsight(
  user: AuthUser,
  input: { id: string; insight: number },
): Promise<MutationResult & { insight: number }> {
  const insight = Math.max(
    INSIGHT_MIN,
    Math.min(INSIGHT_MAX, Math.round(input.insight)),
  )
  const res = await db
    .update(characters)
    .set({ insight })
    .where(ownedCharacter(user, input.id))
    .returning({ id: characters.id })
  return {
    ok: res.length > 0,
    error: res.length ? null : 'not_authorized',
    insight,
  }
}

// GM-only: lock a character at the Insight-6 sacrifice (PC lost). This writes a
// protected column, so it is GM-only (old column-guard trigger territory).
export async function setCharacterLock(
  user: AuthUser,
  input: { id: string; locked: boolean },
): Promise<MutationResult> {
  assertGm(user)
  await db
    .update(characters)
    .set({ insightLockedAt: input.locked ? new Date() : null })
    .where(eq(characters.id, input.id))
  return { ok: true, error: null }
}

// GM-only: edit the Atrito note.
export async function saveAtrito(
  user: AuthUser,
  input: { characterId: string; atrito: string },
): Promise<MutationResult> {
  assertGm(user)
  await db
    .insert(characterGmNotes)
    .values({ characterId: input.characterId, atrito: input.atrito })
    .onConflictDoUpdate({
      target: characterGmNotes.characterId,
      set: { atrito: input.atrito },
    })
  return { ok: true, error: null }
}

// GM-only: write the full six-suns state (lit/extinguished per index).
export async function writeSuns(
  user: AuthUser,
  input: { suns: boolean[] },
): Promise<MutationResult> {
  assertGm(user)
  const suns = Array.from({ length: SUN_COUNT }, (_, i) => Boolean(input.suns[i]))
  await db.update(sixSunsState).set({ suns }).where(eq(sixSunsState.id, true))
  return { ok: true, error: null }
}

// GM-only: add a Legacy entry.
export async function createLegacyEntry(
  user: AuthUser,
  input: { texto: string; status?: LegacyStatus; position?: number },
): Promise<MutationResult> {
  assertGm(user)
  await db.insert(legacyEntries).values({
    texto: input.texto,
    status: input.status ?? 'secured',
    position: input.position ?? 0,
  })
  return { ok: true, error: null }
}

// GM-only: update a Legacy entry (text and/or status).
export async function editLegacyEntry(
  user: AuthUser,
  input: { id: string; texto?: string; status?: LegacyStatus },
): Promise<MutationResult> {
  assertGm(user)
  const patch: { texto?: string; status?: LegacyStatus } = {}
  if (typeof input.texto === 'string') patch.texto = input.texto
  if (input.status) patch.status = input.status
  if (Object.keys(patch).length === 0) return { ok: true, error: null }
  await db.update(legacyEntries).set(patch).where(eq(legacyEntries.id, input.id))
  return { ok: true, error: null }
}

// GM-only: delete a Legacy entry.
export async function removeLegacyEntry(
  user: AuthUser,
  input: { id: string },
): Promise<MutationResult> {
  assertGm(user)
  await db.delete(legacyEntries).where(eq(legacyEntries.id, input.id))
  return { ok: true, error: null }
}
