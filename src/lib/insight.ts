import { INSIGHT_MAX, INSIGHT_MIN } from '#/lib/game'

// Thematic ladder for the Insight track (0–6), pt-BR. Flavor only.
export const INSIGHT_LADDER: Record<number, string> = {
  0: 'Intocado',
  1: 'Primeiras rachaduras',
  2: 'Primeiras rachaduras',
  3: 'O medo ganha forma',
  4: 'O medo ganha forma',
  5: 'Por um fio',
  6: 'Perdido',
}

function clampInsight(value: number): number {
  return Math.max(INSIGHT_MIN, Math.min(INSIGHT_MAX, Math.round(value)))
}

// The thematic phase label for an Insight value (0–6).
export function insightPhase(value: number): string {
  return INSIGHT_LADDER[clampInsight(value)] ?? ''
}

// The dominant accent for an Insight value: cold when untouched, gold as it
// climbs, then bleeding into crimson near the end. Returns a CSS var so it
// tracks the theme. Used by the dial, sigil, roster and phase label.
export function insightColor(value: number): string {
  const v = clampInsight(value)
  if (v >= 6) return 'var(--color-crimson)'
  if (v >= 5) return 'var(--color-crimson-soft)'
  if (v >= 1) return 'var(--color-gold)'
  return 'var(--color-text-3)'
}
