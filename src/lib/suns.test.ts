import { describe, expect, it } from 'vitest'
import {
  litCount,
  sunCaption,
  sunTransition,
  toggleSunsAt,
} from '#/lib/suns'

const all = (v: boolean) => Array<boolean>(6).fill(v)

describe('litCount', () => {
  it('counts burning suns regardless of order', () => {
    expect(litCount(all(true))).toBe(6)
    expect(litCount(all(false))).toBe(0)
    expect(litCount([true, true, false, true, false, false])).toBe(3)
  })
})

describe('toggleSunsAt', () => {
  it('extinguishes the clicked lit sun and every sun after it', () => {
    // all lit, click index 3 → 3 remain lit
    expect(toggleSunsAt(all(true), 3)).toEqual([true, true, true, false, false, false])
  })

  it('rekindles up to and including a clicked dead sun', () => {
    const suns = [true, true, true, false, false, false]
    expect(toggleSunsAt(suns, 4)).toEqual([true, true, true, true, true, false])
  })

  it('clicking the first lit sun extinguishes everything', () => {
    expect(toggleSunsAt(all(true), 0)).toEqual(all(false))
  })

  it('clicking the last dead sun relights everything', () => {
    expect(toggleSunsAt(all(false), 5)).toEqual(all(true))
  })

  it('always returns a clean prefix of lit suns', () => {
    for (let i = 0; i < 6; i++) {
      const out = toggleSunsAt(all(true), i)
      const firstDead = out.indexOf(false)
      if (firstDead !== -1) {
        expect(out.slice(firstDead).every((s) => !s)).toBe(true)
      }
    }
  })
})

describe('sunCaption', () => {
  it('renders the count in words', () => {
    expect(sunCaption(6).text).toBe('Seis sóis ardem sobre Lagash.')
    expect(sunCaption(4).text).toBe('Quatro sóis ardem sobre Lagash.')
    expect(sunCaption(0).text).toBe('Nenhum sol arde sobre Lagash.')
  })

  it('flags danger at two or fewer suns', () => {
    expect(sunCaption(3).danger).toBe(false)
    expect(sunCaption(2).danger).toBe(true)
    expect(sunCaption(1).danger).toBe(true)
    expect(sunCaption(0).danger).toBe(true)
  })

  it('clamps out-of-range counts', () => {
    expect(sunCaption(9).text).toBe('Seis sóis ardem sobre Lagash.')
    expect(sunCaption(-2).text).toBe('Nenhum sol arde sobre Lagash.')
  })
})

describe('sunTransition', () => {
  it('marks unchanged suns as lit/dead', () => {
    expect(sunTransition(all(true), all(true))).toEqual(Array(6).fill('lit'))
    expect(sunTransition(all(false), all(false))).toEqual(Array(6).fill('dead'))
  })

  it('marks newly extinguished suns as dying', () => {
    const prev = all(true)
    const next = [true, true, true, false, false, false]
    expect(sunTransition(prev, next)).toEqual([
      'lit', 'lit', 'lit', 'dying', 'dying', 'dying',
    ])
  })

  it('marks newly lit suns as kindling', () => {
    const prev = [true, true, true, false, false, false]
    const next = all(true)
    expect(sunTransition(prev, next)).toEqual([
      'lit', 'lit', 'lit', 'kindling', 'kindling', 'kindling',
    ])
  })
})
