import { describe, expect, it } from 'vitest'
import { matchesFilter, rosterFilter, type RosterFilter } from '#/lib/roster'
import type { CharacterRow } from '#/lib/game'

// Minimal CharacterRow factory — only the fields the roster logic reads matter.
function char(partial: { nome: string; ocupacao: string; insight: number }): CharacterRow {
  return {
    id: partial.nome.toLowerCase(),
    slug: partial.nome.toLowerCase(),
    owner_user_id: null,
    nome: partial.nome,
    ocupacao: partial.ocupacao,
    epigrafe: '',
    descricao: '',
    vinculo: '',
    gancho: '',
    medo: '',
    quer_do_grupo: '',
    teme_perder: '',
    insight: partial.insight,
    insight_locked_at: null,
    position: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const roster: CharacterRow[] = [
  char({ nome: 'Halda', ocupacao: 'Astrônoma', insight: 2 }),
  char({ nome: 'Vessa', ocupacao: 'Repórter', insight: 0 }),
  char({ nome: 'Sehra', ocupacao: 'Arquivista', insight: 5 }),
  char({ nome: 'Orren', ocupacao: 'Clérigo das Seis', insight: 6 }),
  char({ nome: 'Corvin', ocupacao: 'Oficial da Guarda', insight: 4 }),
]

const names = (cs: CharacterRow[]) => cs.map((c) => c.nome)

describe('matchesFilter', () => {
  it('todos matches every insight value', () => {
    for (let v = 0; v <= 6; v++) expect(matchesFilter(v, 'todos')).toBe(true)
  })

  it('ativos = insight < 6', () => {
    expect(matchesFilter(0, 'ativos')).toBe(true)
    expect(matchesFilter(5, 'ativos')).toBe(true)
    expect(matchesFilter(6, 'ativos')).toBe(false)
  })

  it('risco = 4 or 5 only', () => {
    expect(matchesFilter(3, 'risco')).toBe(false)
    expect(matchesFilter(4, 'risco')).toBe(true)
    expect(matchesFilter(5, 'risco')).toBe(true)
    expect(matchesFilter(6, 'risco')).toBe(false)
  })

  it('perdidos = insight >= 6', () => {
    expect(matchesFilter(5, 'perdidos')).toBe(false)
    expect(matchesFilter(6, 'perdidos')).toBe(true)
  })
})

describe('rosterFilter', () => {
  it('returns everyone with the default filter and empty term', () => {
    expect(rosterFilter(roster, 'todos', '')).toHaveLength(5)
  })

  it('filters by insight state', () => {
    expect(names(rosterFilter(roster, 'ativos', ''))).toEqual([
      'Halda',
      'Vessa',
      'Sehra',
      'Corvin',
    ])
    expect(names(rosterFilter(roster, 'risco', ''))).toEqual(['Sehra', 'Corvin'])
    expect(names(rosterFilter(roster, 'perdidos', ''))).toEqual(['Orren'])
  })

  it('searches by name, case-insensitively', () => {
    expect(names(rosterFilter(roster, 'todos', 'hal'))).toEqual(['Halda'])
    expect(names(rosterFilter(roster, 'todos', 'SEHRA'))).toEqual(['Sehra'])
  })

  it('searches by occupation', () => {
    expect(names(rosterFilter(roster, 'todos', 'guarda'))).toEqual(['Corvin'])
    expect(names(rosterFilter(roster, 'todos', 'clérigo'))).toEqual(['Orren'])
  })

  it('combines search and filter', () => {
    // "Oficial da Guarda" matches Corvin, and Corvin (4) is em risco.
    expect(names(rosterFilter(roster, 'risco', 'oficial'))).toEqual(['Corvin'])
    // Halda matches the term but is not em risco.
    expect(rosterFilter(roster, 'risco', 'halda')).toHaveLength(0)
  })

  it('trims whitespace in the term', () => {
    expect(names(rosterFilter(roster, 'todos', '  vessa  '))).toEqual(['Vessa'])
  })

  it('returns empty when nothing matches', () => {
    const filters: RosterFilter[] = ['todos', 'ativos', 'risco', 'perdidos']
    for (const f of filters) {
      expect(rosterFilter(roster, f, 'zzzznotfound')).toEqual([])
    }
  })
})
