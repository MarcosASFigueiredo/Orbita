import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { LegacyEntryRow, LegacyStatus } from '#/lib/game'

const STATUS_META: Record<LegacyStatus, { label: string; color: string }> = {
  secured: { label: 'Assegurado', color: 'var(--color-star)' },
  threatened: { label: 'Ameaçado', color: 'var(--color-threat)' },
  lost: { label: 'Perdido', color: 'var(--color-lost)' },
}

const STATUS_ORDER: LegacyStatus[] = ['secured', 'threatened', 'lost']

interface LegacyTrackProps {
  entries: LegacyEntryRow[]
  editable: boolean
  onAdd?: (texto: string) => void
  onSetStatus?: (id: string, status: LegacyStatus) => void
  onEditText?: (id: string, texto: string) => void
  onDelete?: (id: string) => void
}

// Trilha do Legado — the win condition made visible: concrete statements the
// party has secured. A list, never a score. Players see it read-only.
export function LegacyTrack({
  entries,
  editable,
  onAdd,
  onSetStatus,
  onEditText,
  onDelete,
}: LegacyTrackProps) {
  const [novo, setNovo] = useState('')

  return (
    <div>
      <p className="field-label">Trilha do Legado</p>

      {entries.length === 0 && (
        <p className="text-sm text-[var(--color-mist-dim)]">
          Nada ainda foi assegurado contra a escuridão.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const meta = STATUS_META[entry.status]
          const isLost = entry.status === 'lost'
          return (
            <li
              key={entry.id}
              className="rounded-lg border border-[var(--color-line)] bg-[rgba(8,11,24,0.5)] p-3"
              style={{ borderLeft: `3px solid ${meta.color}` }}
            >
              <div className="flex items-start justify-between gap-3">
                {editable && onEditText ? (
                  <input
                    type="text"
                    defaultValue={entry.texto}
                    className="field-input"
                    onBlur={(e) => {
                      if (e.target.value !== entry.texto) onEditText(entry.id, e.target.value)
                    }}
                  />
                ) : (
                  <p
                    className="flex-1 text-sm leading-relaxed"
                    style={{
                      color: isLost ? 'var(--color-lost)' : 'var(--color-starlight)',
                      textDecoration: isLost ? 'line-through' : 'none',
                    }}
                  >
                    {entry.texto}
                  </p>
                )}

                {editable && onDelete && (
                  <button
                    type="button"
                    aria-label="Remover entrada"
                    className="btn btn-danger shrink-0 px-2"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {editable && onSetStatus ? (
                <div className="mt-2 flex gap-1.5">
                  {STATUS_ORDER.map((status) => {
                    const active = entry.status === status
                    return (
                      <button
                        key={status}
                        type="button"
                        className="btn px-2.5 py-1 text-xs"
                        style={
                          active
                            ? {
                                borderColor: STATUS_META[status].color,
                                color: STATUS_META[status].color,
                              }
                            : undefined
                        }
                        onClick={() => onSetStatus(entry.id, status)}
                      >
                        {STATUS_META[status].label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <span
                  className="mt-1 inline-block text-xs font-semibold uppercase tracking-wide"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {editable && onAdd && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const texto = novo.trim()
            if (texto) {
              onAdd(texto)
              setNovo('')
            }
          }}
        >
          <input
            type="text"
            className="field-input"
            placeholder="Nova entrada do legado…"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
          />
          <button type="submit" className="btn btn-primary shrink-0 px-3" disabled={!novo.trim()}>
            <Plus size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
