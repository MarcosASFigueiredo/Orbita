import { memo, useEffect, useRef } from 'react'
import { SUN_COUNT } from '#/lib/game'
import { SUN_NAMES, sunTransition, type SunState } from '#/lib/suns'
import { applySunFx } from '#/lib/sun-fx'

// The player's Insight as the constellation of their inner sky — a personal
// mirror of the Six Suns clock. Insight N = N suns dead, dying in order, so the
// sky darkens as the mind understands too much. Same death/rekindle system as
// the clock (build-once SVG, imperative state), plus the connecting lines that
// fade as their suns die, so the figure comes apart.

// Irregular scatter (deliberately not a straight line).
const POS = [
  { x: 46, y: 96 },
  { x: 98, y: 46 },
  { x: 150, y: 120 },
  { x: 196, y: 56 },
  { x: 250, y: 128 },
  { x: 296, y: 72 },
]
const BG_STARS = [
  { x: 28, y: 150, r: 1 },
  { x: 74, y: 24, r: 0.9 },
  { x: 128, y: 168, r: 1.1 },
  { x: 172, y: 30, r: 0.8 },
  { x: 224, y: 24, r: 1 },
  { x: 276, y: 160, r: 0.9 },
  { x: 312, y: 118, r: 1.1 },
  { x: 14, y: 60, r: 0.8 },
]

// A sun is lit until Insight reaches it; suns die in index order.
const insightToLit = (insight: number) =>
  Array.from({ length: SUN_COUNT }, (_, i) => i >= insight)

const lineOpacity = (i: number, insight: number) => {
  const dead = (i < insight ? 1 : 0) + (i + 1 < insight ? 1 : 0)
  return dead === 2 ? 0.1 : dead === 1 ? 0.35 : 1
}

const Skeleton = memo(
  function Skeleton({ initialInsight }: { initialInsight: number }) {
    const lit = insightToLit(initialInsight)
    return (
      <svg viewBox="0 0 320 190" className="h-auto w-full overflow-visible">
        <g fill="var(--color-gold-faint)">
          {BG_STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} />
          ))}
        </g>

        {POS.slice(0, -1).map((p, i) => {
          const q = POS[i + 1]
          return (
            <line
              key={i}
              data-line={i}
              className="constellation-line"
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke="rgba(201,165,88,0.4)"
              strokeWidth="0.8"
              style={{ opacity: lineOpacity(i, initialInsight) }}
            />
          )
        })}

        {POS.map((p, i) => {
          const below = p.y <= 95
          return (
            <g key={i} data-sun={i}>
              <circle
                className={`sun-halo${lit[i] ? ' lit' : ''}`}
                cx={p.x}
                cy={p.y}
                r="12"
              />
              <circle
                className={`sun-core ${lit[i] ? 'lit' : 'dead'}`}
                cx={p.x}
                cy={p.y}
                r="6"
                strokeWidth="1"
              />
              <text
                className={`sun-label ${lit[i] ? 'lit' : 'dead'}`}
                x={p.x}
                y={below ? p.y + 18 : p.y - 12}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="8"
              >
                {SUN_NAMES[i]}
              </text>
            </g>
          )
        })}
      </svg>
    )
  },
  () => true, // never re-render — owned imperatively
)

export function InsightConstellation({ insight }: { insight: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<number | null>(null)
  const animsRef = useRef<Map<string, Animation>>(new Map())

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const nextLit = insightToLit(insight)
    const prevLit = prevRef.current === null ? null : insightToLit(prevRef.current)
    const states: SunState[] = prevLit
      ? sunTransition(prevLit, nextLit)
      : nextLit.map((l) => (l ? 'lit' : 'dead'))

    states.forEach((st, i) => {
      const g = root.querySelector(`[data-sun="${i}"]`)
      const core = g?.querySelector('.sun-core') as SVGElement | null
      const halo = g?.querySelector('.sun-halo') as SVGElement | null
      const label = g?.querySelector('.sun-label') as SVGElement | null
      if (core && halo) applySunFx({ core, halo, label }, st, reduce, animsRef.current, String(i))
    })

    root.querySelectorAll('[data-line]').forEach((ln) => {
      const i = Number(ln.getAttribute('data-line'))
      ;(ln as SVGElement).style.opacity = String(lineOpacity(i, insight))
    })

    prevRef.current = insight
  }, [insight])

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[340px]">
      <Skeleton initialInsight={insight} />
    </div>
  )
}
