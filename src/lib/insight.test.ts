import { describe, expect, it } from 'vitest'
import { insightColor, insightPhase } from '#/lib/insight'

describe('insightPhase', () => {
  it('maps each value 0–6 to its thematic phase', () => {
    expect(insightPhase(0)).toBe('Intocado')
    expect(insightPhase(1)).toBe('Primeiras rachaduras')
    expect(insightPhase(2)).toBe('Primeiras rachaduras')
    expect(insightPhase(3)).toBe('O medo ganha forma')
    expect(insightPhase(4)).toBe('O medo ganha forma')
    expect(insightPhase(5)).toBe('Por um fio')
    expect(insightPhase(6)).toBe('Perdido')
  })

  it('clamps out-of-range values', () => {
    expect(insightPhase(-3)).toBe('Intocado')
    expect(insightPhase(99)).toBe('Perdido')
  })

  it('rounds fractional values', () => {
    expect(insightPhase(2.4)).toBe('Primeiras rachaduras')
    expect(insightPhase(4.6)).toBe('Por um fio')
  })
})

describe('insightColor', () => {
  it('is cold when untouched', () => {
    expect(insightColor(0)).toBe('var(--color-text-3)')
  })

  it('is gold while climbing (1–4)', () => {
    for (const v of [1, 2, 3, 4]) expect(insightColor(v)).toBe('var(--color-gold)')
  })

  it('softens toward crimson at 5 and full crimson at 6', () => {
    expect(insightColor(5)).toBe('var(--color-crimson-soft)')
    expect(insightColor(6)).toBe('var(--color-crimson)')
  })

  it('clamps beyond the range', () => {
    expect(insightColor(-1)).toBe('var(--color-text-3)')
    expect(insightColor(10)).toBe('var(--color-crimson)')
  })
})
