import { insightColor } from '#/lib/insight'
import { INSIGHT_MAX } from '#/lib/game'

// Instrument dial for a character's Insight — a circular gauge with the value
// in serif at its center. The arc animates as the value changes.
export function InsightDial({ value }: { value: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / INSIGHT_MAX))
  const col = insightColor(value)

  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-gold-faint)" strokeWidth="2" />
      <circle
        className="arc-anim"
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={col}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
        transform="rotate(-90 48 48)"
      />
      <text
        x="48"
        y="46"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontSize="26"
        fill={col}
      >
        {value}
      </text>
      <text
        x="48"
        y="62"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="8"
        letterSpacing="2"
        fill="var(--color-text-3)"
      >
        DE 6
      </text>
    </svg>
  )
}
