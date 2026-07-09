import { Minus, Plus } from 'lucide-react'
import { insightLadder, insightSegmentColor } from '#/lib/insight'
import { INSIGHT_MAX, INSIGHT_MIN } from '#/lib/game'

interface InsightTrackProps {
  value: number
  editable: boolean
  onChange: (value: number) => void
  locked?: boolean
  compact?: boolean
}

// Trilha de Insight (0–6). Visually communicates mounting dread as it climbs:
// filled segments shift from cool → amber → dread red.
export function InsightTrack({
  value,
  editable,
  onChange,
  locked = false,
  compact = false,
}: InsightTrackProps) {
  const clamped = Math.max(INSIGHT_MIN, Math.min(INSIGHT_MAX, value))
  const atSix = clamped >= INSIGHT_MAX

  return (
    <div className="rise-in">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="field-label mb-0">Trilha de Insight</span>
        <span
          className="text-xs font-semibold"
          style={{ color: atSix ? 'var(--color-dread)' : 'var(--color-mist)' }}
        >
          {clamped} / {INSIGHT_MAX} — {insightLadder(clamped)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {editable && (
          <button
            type="button"
            aria-label="Diminuir Insight"
            className="btn shrink-0 px-2"
            disabled={clamped <= INSIGHT_MIN || locked}
            onClick={() => onChange(clamped - 1)}
          >
            <Minus size={16} />
          </button>
        )}

        <div
          className={`flex flex-1 gap-1.5 ${compact ? 'h-2.5' : 'h-4'}`}
          role="meter"
          aria-valuemin={INSIGHT_MIN}
          aria-valuemax={INSIGHT_MAX}
          aria-valuenow={clamped}
          aria-label="Insight"
        >
          {Array.from({ length: INSIGHT_MAX }, (_, i) => {
            const level = i + 1
            const filled = level <= clamped
            return (
              <div
                key={level}
                className="flex-1 rounded-full transition-colors duration-300"
                style={{
                  background: filled
                    ? insightSegmentColor(level)
                    : 'rgba(42, 51, 94, 0.5)',
                  boxShadow:
                    filled && level >= 5
                      ? '0 0 10px color-mix(in oklab, var(--color-dread) 60%, transparent)'
                      : undefined,
                }}
              />
            )
          })}
        </div>

        {editable && (
          <button
            type="button"
            aria-label="Aumentar Insight"
            className="btn shrink-0 px-2"
            disabled={clamped >= INSIGHT_MAX || locked}
            onClick={() => onChange(clamped + 1)}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {locked && (
        <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-dread)' }}>
          Perdido — este personagem saiu de jogo.
        </p>
      )}
    </div>
  )
}
