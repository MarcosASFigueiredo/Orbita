import { SUN_COUNT } from '#/lib/game'

// The Six Suns — placeholder canonical names, in the order they die (Ardor
// first … Última last). Confirmed to keep the placeholders for now.
export const SUN_NAMES = ['Ardor', 'Vigília', 'Zênite', 'Umbra', 'Cinza', 'Última'] as const

// Per-sun transition between two states, driving the death/rekindle animation.
export type SunState = 'lit' | 'dead' | 'dying' | 'kindling'

// How many suns still burn.
export function litCount(suns: ReadonlyArray<boolean>): number {
  return suns.reduce((n, lit) => (lit ? n + 1 : n), 0)
}

// GM click: suns die in order, so clicking cumulatively extinguishes/rekindles
// "up to and including" the clicked one. Clicking a lit sun darkens it and every
// sun after it; clicking a dead sun rekindles it and every sun before it.
export function toggleSunsAt(
  suns: ReadonlyArray<boolean>,
  index: number,
): boolean[] {
  const newLit = suns[index] ? index : index + 1
  return Array.from({ length: SUN_COUNT }, (_, j) => j < newLit)
}

const CAPTION_WORDS = [
  'Nenhum sol arde',
  'Um sol arde',
  'Dois sóis ardem',
  'Três sóis ardem',
  'Quatro sóis ardem',
  'Cinco sóis ardem',
  'Seis sóis ardem',
] as const

// The diegetic legend under the clock. Turns ominous (danger) at two or fewer.
export function sunCaption(count: number): { text: string; danger: boolean } {
  const c = Math.max(0, Math.min(SUN_COUNT, count))
  return { text: `${CAPTION_WORDS[c]} sobre Lagash.`, danger: c <= 2 }
}

// Per-index transition from a previous suns array to the next — feeds the
// build-once animation dispatch (which suns should flare-and-collapse, which
// should bloom back, which just rest).
export function sunTransition(
  prev: ReadonlyArray<boolean>,
  next: ReadonlyArray<boolean>,
): SunState[] {
  return Array.from({ length: SUN_COUNT }, (_, i) => {
    const was = prev[i] ?? true
    const now = next[i] ?? true
    if (was && now) return 'lit'
    if (!was && !now) return 'dead'
    return was ? 'dying' : 'kindling'
  })
}
