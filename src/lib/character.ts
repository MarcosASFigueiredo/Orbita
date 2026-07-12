// Framework-neutral helpers for character sheets.

// Combining diacritical marks (U+0300–U+036F), stripped after NFD normalization
// so "Astrônoma" → "astronoma".
const DIACRITICS = /[̀-ͯ]/g

// Derive a URL-safe slug base from a character's name: lowercased, accents
// stripped, non-alphanumerics collapsed to dashes. Falls back to 'pc' for names
// with no usable characters. The server appends a random suffix to guarantee
// uniqueness (slugs are a stable unique id, but ownership is by owner_user_id).
export function slugFromName(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'pc'
}
