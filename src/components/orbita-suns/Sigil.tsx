import { insightColor } from '#/lib/insight'
import { INSIGHT_MAX } from '#/lib/game'
import type { CharacterRow } from '#/lib/game'

// A small circular seal per character: a ring that fills with Insight around
// the character's initial, bleeding to crimson at 6.
export function Sigil({ character }: { character: CharacterRow }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, character.insight / INSIGHT_MAX))
  const col = insightColor(character.insight)
  const lost = character.insight >= INSIGHT_MAX

  return (
    <svg viewBox="0 0 40 40" className="h-full w-full">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-gold-faint)" strokeWidth="1" />
      <circle
        className="arc-anim"
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={col}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
        transform="rotate(-90 20 20)"
      />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontSize="15"
        fill={lost ? col : 'var(--color-text)'}
      >
        {character.nome.charAt(0).toUpperCase() || '?'}
      </text>
    </svg>
  )
}
