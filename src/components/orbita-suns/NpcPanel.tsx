import { useState } from 'react'
import { Archive, MapPin, Pencil, Plus, RotateCcw, Users } from 'lucide-react'
import type { NpcFields, NpcRow } from '#/lib/game'

const EMPTY: NpcFields = {
  nome: '',
  papel: '',
  descricao: '',
  notas: '',
  faccao: '',
  local: '',
}

// GM-only NPC workbench: leaner than the PC codex. Create, edit, archive and
// restore prep NPCs. NPCs never reach a Player, so this lives only on the GM
// dashboard. Not in the SSE feed — the parent refetches after each action.
export function NpcPanel({
  npcs,
  onCreate,
  onEdit,
  onArchive,
  onRestore,
}: {
  npcs: NpcRow[]
  onCreate: (fields: NpcFields) => Promise<void>
  onEdit: (id: string, fields: Partial<NpcFields>) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const active = npcs.filter((n) => n.deleted_at === null)
  const archived = npcs.filter((n) => n.deleted_at !== null)
  const list = showArchived ? archived : active

  return (
    <div className="plate reveal tiltable p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="plate-title mb-0">
          <span className="glyph">✦</span>NPCs
        </p>
        <div className="flex items-center gap-2">
          {archived.length > 0 && (
            <button
              type="button"
              className={`chip ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived((v) => !v)}
            >
              Arquivados ({archived.length})
            </button>
          )}
          {!showArchived && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreating((v) => !v)}
            >
              <Plus size={15} />
              Novo NPC
            </button>
          )}
        </div>
      </div>

      {creating && !showArchived && (
        <NpcForm
          initial={EMPTY}
          submitLabel="Criar NPC"
          onSubmit={async (fields) => {
            await onCreate(fields)
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {list.length === 0 ? (
        <p className="py-6 text-center font-serif text-sm italic text-[var(--color-text-3)]">
          {showArchived
            ? 'Nenhum NPC arquivado.'
            : 'Nenhum NPC ainda. Crie o primeiro acima.'}
        </p>
      ) : (
        <div className="grid gap-3 min-[900px]:grid-cols-2">
          {list.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              archived={showArchived}
              onEdit={onEdit}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NpcCard({
  npc,
  archived,
  onEdit,
  onArchive,
  onRestore,
}: {
  npc: NpcRow
  archived: boolean
  onEdit: (id: string, fields: Partial<NpcFields>) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-[3px] border border-[var(--color-vein)] p-4">
        <NpcForm
          initial={{
            nome: npc.nome,
            papel: npc.papel,
            descricao: npc.descricao,
            notas: npc.notas,
            faccao: npc.faccao,
            local: npc.local,
          }}
          submitLabel="Salvar"
          onSubmit={async (fields) => {
            await onEdit(npc.id, fields)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-[var(--color-vein)] p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-medium text-[var(--color-text)]">
            {npc.nome || 'Sem nome'}
          </p>
          {npc.papel && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-3)]">
              {npc.papel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {archived ? (
            <IconButton
              title="Reativar NPC"
              disabled={busy}
              onClick={() => run(() => onRestore(npc.id))}
            >
              <RotateCcw size={14} />
            </IconButton>
          ) : (
            <>
              <IconButton
                title="Editar NPC"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} />
              </IconButton>
              <IconButton
                title="Arquivar NPC"
                disabled={busy}
                onClick={() => run(() => onArchive(npc.id))}
              >
                <Archive size={14} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {(npc.faccao || npc.local) && (
        <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-[var(--color-text-2)]">
          {npc.faccao && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} className="text-[var(--color-text-3)]" />
              {npc.faccao}
            </span>
          )}
          {npc.local && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} className="text-[var(--color-text-3)]" />
              {npc.local}
            </span>
          )}
        </div>
      )}

      {npc.descricao && (
        <p className="mb-2 font-serif text-sm leading-relaxed text-[var(--color-text-2)]">
          {npc.descricao}
        </p>
      )}
      {npc.notas && (
        <p className="mt-auto border-t border-[var(--color-vein)] pt-2 text-[13px] italic text-[var(--color-text-3)]">
          {npc.notas}
        </p>
      )}
    </div>
  )
}

function NpcForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: NpcFields
  submitLabel: string
  onSubmit: (fields: NpcFields) => Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState<NpcFields>(initial)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof NpcFields, value: string) =>
    setF((prev) => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nome.trim()) return
    setBusy(true)
    try {
      await onSubmit({ ...f, nome: f.nome.trim() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-5 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            autoFocus
            className="field-input"
            placeholder="Nome do NPC"
            value={f.nome}
            onChange={(e) => set('nome', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Papel na história</span>
          <input
            className="field-input"
            placeholder="Ex.: Reitor da Universidade"
            value={f.papel}
            onChange={(e) => set('papel', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Facção</span>
          <input
            className="field-input"
            placeholder="Ex.: Clero das Seis"
            value={f.faccao}
            onChange={(e) => set('faccao', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Localização</span>
          <input
            className="field-input"
            placeholder="Ex.: Observatório"
            value={f.local}
            onChange={(e) => set('local', e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Descrição</span>
        <textarea
          className="field-textarea"
          placeholder="Aparência, maneirismos, o que sabe…"
          value={f.descricao}
          onChange={(e) => set('descricao', e.target.value)}
        />
      </label>
      <label className="block">
        <span className="field-label">Notas do Mestre</span>
        <textarea
          className="field-textarea"
          placeholder="Segredos, ganchos, lembretes de cena…"
          value={f.notas}
          onChange={(e) => set('notas', e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !f.nome.trim()}
        >
          {busy ? 'Salvando…' : submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function IconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-transparent text-[var(--color-text-3)] transition-colors hover:border-[var(--color-gold-dim)] hover:text-[var(--color-gold-bright)] disabled:opacity-40"
    >
      {children}
    </button>
  )
}
