// Thematic ladder for the Insight track (0–6), pt-BR. Flavor only.
export const INSIGHT_LADDER: Record<number, string> = {
  0: 'Intocado',
  1: 'Primeiras rachaduras',
  2: 'Primeiras rachaduras',
  3: 'O medo ganha forma',
  4: 'O medo ganha forma',
  5: 'Viu demais — segura por um fio',
  6: 'Perdido',
}

export function insightLadder(value: number): string {
  return INSIGHT_LADDER[Math.max(0, Math.min(6, value))] ?? ''
}

// Color for a filled Insight segment at a given level (1–6): cool at the
// bottom, warming and then bleeding into dread as it climbs toward 6.
export function insightSegmentColor(level: number): string {
  if (level >= 6) return 'var(--color-dread)'
  if (level === 5) return 'var(--color-dread-deep)'
  if (level >= 3) return 'var(--color-threat)'
  return 'var(--color-mist)'
}
