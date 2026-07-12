// Server-only core for NPCs — GM prep entities. A separate table from
// characters (not a `kind` column) precisely so an over-broad character read
// can never leak an NPC to a Player: NPCs are returned ONLY by these GM-only
// functions and never appear in any Player-facing response (same isolation
// discipline as Atrito).
import '@tanstack/react-start/server-only'

import { and, asc, eq, isNull, sql, type InferSelectModel } from 'drizzle-orm'
import { db } from '#/server/db/client'
import { npcs } from '#/server/db/schema'
import { assertGm } from '#/server/session'
import type { AuthUser } from '#/server/session'
import type { NpcFields, NpcRow } from '#/lib/game'
import type { MutationResult } from '#/server/data.core'

type DbNpc = InferSelectModel<typeof npcs>

function toNpcRow(r: DbNpc): NpcRow {
  return {
    id: r.id,
    nome: r.nome,
    papel: r.papel,
    descricao: r.descricao,
    notas: r.notas,
    faccao: r.faccao,
    local: r.local,
    position: r.position,
    deleted_at: r.deletedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

const NPC_KEYS: ReadonlyArray<keyof NpcFields> = [
  'nome',
  'papel',
  'descricao',
  'notas',
  'faccao',
  'local',
]

// GM-only: every NPC, active first (by position) then archived. The panel splits
// the list by `deleted_at`; one query keeps the archive view free of a refetch.
export async function listNpcs(user: AuthUser): Promise<NpcRow[]> {
  assertGm(user)
  const rows = await db
    .select()
    .from(npcs)
    .orderBy(sql`${npcs.deletedAt} nulls first`, asc(npcs.position))
  return rows.map(toNpcRow)
}

// GM-only: create an NPC. Only `nome` is required; the rest defaults to empty.
export async function createNpc(
  user: AuthUser,
  input: Partial<NpcFields> & { nome: string },
): Promise<MutationResult & { npc: NpcRow | null }> {
  assertGm(user)
  const nome = input.nome.trim()
  if (!nome) return { ok: false, error: 'nome_required', npc: null }

  const [{ max: maxPos }] = await db
    .select({ max: sql<number | null>`max(${npcs.position})` })
    .from(npcs)
  const position = (maxPos ?? -1) + 1

  const [row] = await db
    .insert(npcs)
    .values({
      nome,
      papel: input.papel?.trim() ?? '',
      descricao: input.descricao ?? '',
      notas: input.notas ?? '',
      faccao: input.faccao?.trim() ?? '',
      local: input.local?.trim() ?? '',
      position,
    })
    .returning()
  return { ok: true, error: null, npc: row ? toNpcRow(row) : null }
}

// GM-only: edit an NPC's fields (whitelisted). Only touches active NPCs.
export async function editNpc(
  user: AuthUser,
  input: { id: string; fields: Partial<NpcFields> },
): Promise<MutationResult> {
  assertGm(user)
  const patch: Partial<typeof npcs.$inferInsert> = {}
  for (const key of NPC_KEYS) {
    const value = input.fields[key]
    if (typeof value === 'string') patch[key] = value
  }
  if (Object.keys(patch).length === 0) return { ok: true, error: null }
  await db
    .update(npcs)
    .set(patch)
    .where(and(eq(npcs.id, input.id), isNull(npcs.deletedAt)))
  return { ok: true, error: null }
}

// GM-only: archive an NPC (soft delete). Reversible via restoreNpc.
export async function archiveNpc(
  user: AuthUser,
  input: { id: string },
): Promise<MutationResult> {
  assertGm(user)
  await db
    .update(npcs)
    .set({ deletedAt: new Date() })
    .where(eq(npcs.id, input.id))
  return { ok: true, error: null }
}

// GM-only: restore a previously archived NPC.
export async function restoreNpc(
  user: AuthUser,
  input: { id: string },
): Promise<MutationResult> {
  assertGm(user)
  await db.update(npcs).set({ deletedAt: null }).where(eq(npcs.id, input.id))
  return { ok: true, error: null }
}
