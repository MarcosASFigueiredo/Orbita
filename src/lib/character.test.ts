import { describe, expect, it } from 'vitest'
import { slugFromName } from '#/lib/character'

describe('slugFromName', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugFromName('Halda Vex')).toBe('halda-vex')
  })

  it('strips accents', () => {
    expect(slugFromName('Astrônoma Zéfiro')).toBe('astronoma-zefiro')
  })

  it('collapses symbols and trims leading/trailing dashes', () => {
    expect(slugFromName('  --A@@b!! ')).toBe('a-b')
  })

  it('falls back to "pc" when nothing usable remains', () => {
    expect(slugFromName('')).toBe('pc')
    expect(slugFromName('#@!')).toBe('pc')
  })
})
