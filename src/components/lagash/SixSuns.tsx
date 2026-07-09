import { Sun } from 'lucide-react'
import { SUN_COUNT } from '#/lib/game'

interface SixSunsProps {
  suns: boolean[]
  editable: boolean
  onToggle: (index: number) => void
}

// Relógio dos Seis Sóis — a diegetic prop, not a progress bar. Six suns glow
// warm amber while lit and go cold/dark when the GM extinguishes them.
export function SixSuns({ suns, editable, onToggle }: SixSunsProps) {
  return (
    <div>
      <p className="field-label">Relógio dos Seis Sóis</p>
      <div className="flex flex-wrap items-center justify-center gap-3 py-2 sm:justify-start">
        {Array.from({ length: SUN_COUNT }, (_, i) => {
          const lit = suns[i] ?? true
          const icon = (
            <Sun
              size={editable ? 34 : 38}
              strokeWidth={1.75}
              style={{
                color: lit ? 'var(--color-sun)' : 'var(--color-mist-dim)',
                filter: lit
                  ? 'drop-shadow(0 0 8px rgba(245, 177, 63, 0.7))'
                  : 'none',
                opacity: lit ? 1 : 0.4,
                transition: 'color 400ms ease, opacity 400ms ease, filter 400ms ease',
              }}
            />
          )
          return editable ? (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-label={`${lit ? 'Apagar' : 'Reacender'} sol ${i + 1}`}
              aria-pressed={lit}
              className="rounded-full p-1.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sun)]"
            >
              {icon}
            </button>
          ) : (
            <span key={i} aria-label={`Sol ${i + 1} ${lit ? 'aceso' : 'apagado'}`}>
              {icon}
            </span>
          )
        })}
      </div>
    </div>
  )
}
