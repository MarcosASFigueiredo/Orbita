import { INSIGHT_MAX } from '#/lib/game'
import type { CharacterRow } from '#/lib/game'

// GM roster filtering by Insight state + free-text search over name/occupation.
// Pure + framework-neutral so the GM dashboard reacts live to Insight changes
// and the logic is unit-testable.
export type RosterFilter = 'todos' | 'ativos' | 'risco' | 'perdidos'

export const ROSTER_FILTERS: ReadonlyArray<{ key: RosterFilter; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativos', label: 'Ativos' },
  { key: 'risco', label: 'Em risco' },
  { key: 'perdidos', label: 'Perdidos' },
]

// Ativos: still in play (< 6). Em risco: 4–5. Perdidos: reached 6.
export function matchesFilter(insight: number, filter: RosterFilter): boolean {
  switch (filter) {
    case 'ativos':
      return insight < INSIGHT_MAX
    case 'risco':
      return insight >= 4 && insight < INSIGHT_MAX
    case 'perdidos':
      return insight >= INSIGHT_MAX
    case 'todos':
    default:
      return true
  }
}

export function rosterFilter(
  characters: ReadonlyArray<CharacterRow>,
  filter: RosterFilter,
  term: string,
): CharacterRow[] {
  const q = term.trim().toLowerCase()
  return characters.filter((c) => {
    if (
      q &&
      !c.nome.toLowerCase().includes(q) &&
      !c.ocupacao.toLowerCase().includes(q)
    ) {
      return false
    }
    return matchesFilter(c.insight, filter)
  })
}
