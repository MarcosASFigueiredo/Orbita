import { useState } from 'react'
import { Search } from 'lucide-react'
import { Sigil } from './Sigil'
import { ROSTER_FILTERS, rosterFilter, type RosterFilter } from '#/lib/roster'
import { insightColor, insightPhase } from '#/lib/insight'
import type { CharacterRow } from '#/lib/game'

// GM roster: search + Insight-state filters + a list of characters with their
// circular Insight sigil. Reacts live to Insight changes (the list comes from
// the parent's optimistic/realtime data; filtering happens on render).
export function Roster({
  characters,
  selectedId,
  onSelect,
}: {
  characters: CharacterRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState<RosterFilter>('todos')
  const shown = rosterFilter(characters, filter, term)

  return (
    <div className="plate reveal tiltable p-6">
      <p className="plate-title">
        <span className="glyph">✦</span>Personagens
      </p>

      <div className="relative mb-3">
        <Search
          size={12}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-3)]"
        />
        <input
          className="field-input pl-8"
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
    </div>
  )
}
