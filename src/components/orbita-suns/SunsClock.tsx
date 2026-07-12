import { memo, useEffect, useRef } from 'react'
import { SUN_COUNT } from '#/lib/game'
import {
  SUN_NAMES,
  litCount,
  sunCaption,
  sunTransition,
  toggleSunsAt,
  type SunState,
} from '#/lib/suns'
import { applySunFx } from '#/lib/sun-fx'

// Relógio dos Seis Sóis — the astrolabe. Six suns + a hexagram orbit the eclipse
// (48s) with the decorative rings spinning the other way; living suns breathe,
// dead ones keep orbiting as cold embers. The GM clicks to extinguish/rekindle
// "up to" a sun; players watch deaths arrive over realtime.
//
// Built once, updated imperatively: the SVG never re-renders (memoized), the
// orbit + upright labels are animated by rAF, and each state change is applied
// on the existing nodes (classes + Web Animations API) so a realtime re-render
// can never interrupt a 1.5s death.

const CX = 200
const CY = 200
const R = 132
const LABEL_OFFSET = 16
const ORBIT_MS = 48_000

const SUNS = Array.from({ length: SUN_COUNT }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3
  return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R }
})
const hex = (idx: number[]) => idx.map((i) => `${SUNS[i].x},${SUNS[i].y}`).join(' ')

const Skeleton = memo(
  function Skeleton({
    editable,
    initialSuns,
  }: {
    editable: boolean
    initialSuns: boolean[]
  }) {
    return (
      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="sunsCorona" cx="50%" cy="50%">
            <stop offset="35%" stopColor="rgba(232,200,126,0.5)" />
            <stop offset="60%" stopColor="rgba(201,165,88,0.14)" />
            <stop offset="100%" stopColor="rgba(201,165,88,0)" />
          </radialGradient>
        </defs>

        <g className="suns-ring-a" fill="none" stroke="var(--color-gold-faint)">
          <circle cx="200" cy="200" r="190" strokeWidth="0.7" />
          <circle cx="200" cy="200" r="182" strokeWidth="0.4" strokeDasharray="1 6" />
        </g>
        <g className="suns-ring-b" fill="none" stroke="rgba(93,90,158,0.3)">
          <circle cx="200" cy="200" r="150" strokeWidth="0.6" strokeDasharray="40 8 2 8" />
        </g>

        <circle className="suns-corona" cx="200" cy="200" r="70" fill="url(#sunsCorona)" />
        <circle cx="200" cy="200" r="30" fill="#07070c" stroke="rgba(232,200,126,0.7)" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="38" fill="none" stroke="var(--color-gold-faint)" strokeWidth="0.6" />

        <g data-orbit>
          <polygon points={hex([0, 2, 4])} fill="none" stroke="rgba(93,90,158,0.28)" strokeWidth="0.5" />
          <polygon points={hex([1, 3, 5])} fill="none" stroke="rgba(93,90,158,0.28)" strokeWidth="0.5" />
          {SUNS.map((p, i) => (
            <g key={i} data-sun={i} style={{ cursor: editable ? 'pointer' : 'default' }}>
              <circle
                className={`sun-halo${initialSuns[i] ? ' lit' : ''}`}
                cx={p.x}
                cy={p.y}
                r="14"
              />
              <circle
                className={`sun-core ${initialSuns[i] ? 'lit' : 'dead'}`}
                cx={p.x}
                cy={p.y}
                r="7"
                strokeWidth="1.1"
              />
              <g data-label={i}>
                <text
                  className={`sun-label ${initialSuns[i] ? 'lit' : 'dead'}`}
                  x={p.x}
                  y={p.y + LABEL_OFFSET}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="8.5"
                >
                  {SUN_NAMES[i]}
                </text>
              </g>
            </g>
          ))}
        </g>
      </svg>
    )
  },
  () => true, // never re-render — the DOM is owned imperatively below
)

// Resolve a sun's DOM nodes and apply its state via the shared FX.
function applySunState(
  root: HTMLElement,
  index: number,
  state: SunState,
  reduce: boolean,
  anims: Map<string, Animation>,
) {
  const group = root.querySelector(`[data-sun="${index}"]`)
  const core = group?.querySelector('.sun-core') as SVGElement | null
  const halo = group?.querySelector('.sun-halo') as SVGElement | null
  const label = group?.querySelector('.sun-label') as SVGElement | null
  if (!core || !halo) return
  applySunFx({ core, halo, label }, state, reduce, anims, String(index))
}

export function SunsClock({
  suns,
  editable,
  onChange,
}: {
  suns: boolean[]
  editable: boolean
  onChange?: (next: boolean[]) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<boolean[] | null>(null)
  const animsRef = useRef<Map<string, Animation>>(new Map())
  const sunsRef = useRef(suns)
  const onChangeRef = useRef(onChange)
  sunsRef.current = suns
  onChangeRef.current = onChange

  // Continuous orbit + upright labels, via rAF setting SVG transform attributes
  // (explicit rotation centers sidestep transform-box quirks). Frozen under
  // prefers-reduced-motion.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const orbit = root.querySelector('[data-orbit]')
    const labels = Array.from(root.querySelectorAll('[data-label]'))
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const angle = (((now - start) / ORBIT_MS) * 360) % 360
      orbit?.setAttribute('transform', `rotate(${angle} ${CX} ${CY})`)
      labels.forEach((el, i) =>
        el.setAttribute('transform', `rotate(${-angle} ${SUNS[i].x} ${SUNS[i].y})`),
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // GM interaction: cumulative extinguish/rekindle. Listeners attached
  // imperatively so the memoized SVG never needs to re-render.
  useEffect(() => {
    const root = rootRef.current
    if (!root || !editable) return
    const groups = Array.from(root.querySelectorAll('[data-sun]'))
    const cleanups = groups.map((g) => {
      const i = Number(g.getAttribute('data-sun'))
      const handler = () => onChangeRef.current?.(toggleSunsAt(sunsRef.current, i))
      g.addEventListener('click', handler)
      return () => g.removeEventListener('click', handler)
    })
    return () => cleanups.forEach((fn) => fn())
  }, [editable])

  // State → visuals. On first run just sets resting states (no animation);
  // afterwards diffs prev→next and fires the death/rekindle flourishes.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const prev = prevRef.current
    const states: SunState[] = prev
      ? sunTransition(prev, suns)
      : suns.map((lit) => (lit ? 'lit' : 'dead'))
    states.forEach((st, i) => applySunState(root, i, st, reduce, animsRef.current))
    prevRef.current = suns.slice()
  }, [suns])

  const cap = sunCaption(litCount(suns))

  return (
    <div>
      <p className="plate-title">
        <span className="glyph">☉</span>Relógio dos seis sóis
      </p>
      <div ref={rootRef} className="relative mx-auto aspect-square w-full max-w-[258px]">
        <Skeleton editable={editable} initialSuns={suns} />
      </div>
      <p
        className="mt-3 text-center font-serif text-sm italic"
        style={{ color: cap.danger ? 'var(--color-crimson)' : 'var(--color-text-2)' }}
      >
        {cap.text}
      </p>
    </div>
  )
}
