import { useState } from 'react'
import { Plus, RotateCcw, Search } from 'lucide-react'
import { Sigil } from './Sigil'
import { ROSTER_FILTERS, rosterFilter, type RosterFilter } from '#/lib/roster'
import { insightColor, insightPhase } from '#/lib/insight'
import type { CharacterRow } from '#/lib/game'

// GM roster: search + Insight-state filters + a list of characters with their
// circular Insight sigil and owner. Reacts live to Insight changes (the list
// comes from the parent's optimistic/realtime data; filtering happens on
// render). An "Arquivados" view lists soft-deleted PCs for restoring.
export function Roster({
  characters,
  archivedCharacters,
  owners,
  selectedId,
  onSelect,
  onCreate,
  onRestore,
}: {
  characters: CharacterRow[]
  archivedCharacters: CharacterRow[]
  /** userId -> player display name, for the owner subline. */
  owners: Record<string, string>
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (nome: string) => Promise<void>
  onRestore: (id: string) => Promise<void>
}) {
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState<RosterFilter>('todos')
  const [creating, setCreating] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [busy, setBusy] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const shown = rosterFilter(characters, filter, term)

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    setBusy(true)
    try {
      await onCreate(novoNome.trim())
      setNovoNome('')
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plate reveal tiltable p-6">
      <div className="flex items-center justify-between">
        <p className="plate-title">
          <span className="glyph">✦</span>Personagens
        </p>
        {!showArchived && (
          <button
            type="button"
            className="mb-4 flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-3)] transition-colors hover:text-[var(--color-gold-bright)]"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus size={13} />
            Nova ficha
          </button>
        )}
      </div>

      {showArchived ? (
        <ArchivedList
          characters={archivedCharacters}
          onRestore={onRestore}
          onBack={() => setShowArchived(false)}
        />
      ) : (
        <>
          {creating && (
            <form onSubmit={submitCreate} className="mb-4 flex gap-2">
              <input
                autoFocus
                className="field-input"
                placeholder="Nome do personagem"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary shrink-0"
                disabled={busy || !novoNome.trim()}
              >
                {busy ? 'Criando…' : 'Criar'}
              </button>
            </form>
          )}

          <div className="relative mb-3">
            <Search
              size={12}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-3)]"
            />
            <input
              // .field-input is unlayered, so its `padding` shorthand beats the
              // Tailwind `pl-*` utility (layered) — set the icon gap inline so it
              // actually wins and the lupa never overlaps the placeholder.
              className="field-input"
              style={{ paddingLeft: '2rem' }}
              placeholder="Buscar nome ou ofício"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {ROSTER_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-6 text-center font-serif text-sm italic text-[var(--color-text-3)]">
              Nenhum nome sob estas estrelas.
            </p>
          ) : (
            <ul>
              {shown.map((c) => {
                const selected = c.id === selectedId
                const owner = c.owner_user_id
                  ? (owners[c.owner_user_id] ?? 'Jogador')
                  : null
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      style={{ transitionTimingFunction: 'var(--ease)' }}
                      className={`mb-0.5 flex w-full items-center gap-3 border-l py-3 pr-2 text-left transition-all duration-300 ${
                        selected
                          ? 'border-[var(--color-gold)] bg-[rgba(201,165,88,0.07)] pl-3.5'
                          : 'border-transparent pl-2.5 hover:border-[var(--color-gold-dim)] hover:bg-[rgba(201,165,88,0.04)] hover:pl-3.5'
                      }`}
                    >
                      <span className="h-[38px] w-[38px] shrink-0">
                        <Sigil character={c} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-base font-medium text-[var(--color-text)]">
                          {c.nome || 'Sem nome'}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-3)]">
                          {c.ocupacao}
                        </span>
                        {owner ? (
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-2)]">
                            {owner}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[var(--color-gold-dim)]">
                            Sem dono
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className="block font-serif text-[15px]"
                          style={{ color: insightColor(c.insight) }}
                        >
                          {c.insight}
                          <span className="text-[11px] text-[var(--color-text-3)]">/6</span>
                        </span>
                        <span className="mt-px block text-[8.5px] uppercase tracking-wide text-[var(--color-text-3)]">
                          {insightPhase(c.insight)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {!showArchived && archivedCharacters.length > 0 && (
        <button
          type="button"
          className="mt-4 w-full border-t border-[var(--color-vein)] pt-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-3)] transition-colors hover:text-[var(--color-gold-bright)]"
          onClick={() => setShowArchived(true)}
        >
          Ver arquivados ({archivedCharacters.length})
        </button>
      )}
    </div>
  )
}

function ArchivedList({
  characters,
  onRestore,
  onBack,
}: {
  characters: CharacterRow[]
  onRestore: (id: string) => Promise<void>
  onBack: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)

  const restore = async (id: string) => {
    setBusy(id)
    try {
      await onRestore(id)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <button
        type="button"
        className="mb-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-3)] transition-colors hover:text-[var(--color-gold-bright)]"
        onClick={onBack}
      >
        ← Voltar aos ativos
      </button>
      {characters.length === 0 ? (
        <p className="py-6 text-center font-serif text-sm italic text-[var(--color-text-3)]">
          Nenhuma ficha arquivada.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {characters.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 border-b border-[var(--color-vein)] py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-base text-[var(--color-text-2)]">
                  {c.nome || 'Sem nome'}
                </span>
                <span className="block text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-3)]">
                  {c.ocupacao}
                </span>
              </span>
              <button
                type="button"
                title="Reativar ficha"
                aria-label="Reativar ficha"
                disabled={busy === c.id}
                onClick={() => restore(c.id)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-3)] transition-colors hover:text-[var(--color-gold-bright)] disabled:opacity-45"
              >
                <RotateCcw size={13} />
                Reativar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
