import type { SunState } from '#/lib/suns'

// Shared sun death/rekindle system — used by the Six Suns clock AND the player's
// Insight constellation so the two read identically (the inner sky mirrors the
// outer). Applies resting appearance or a flare→collapse / bloom on existing DOM
// nodes via the Web Animations API. `anims` tracks the in-flight animation per
// key so a new state cancels the previous one — animations survive realtime
// re-renders (the SVG itself is never rebuilt).
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export interface SunNodes {
  core: SVGElement
  halo: SVGElement
  label?: SVGElement | null
}

// The flare/collapse colors used by the imperative animations. Resting colors
// live in CSS (.sun-core.lit etc.); this palette only drives the transitions so
// a death/rekindle keeps the surface's own hue. The world's Six Suns burn gold
// (default); the player's Insight constellation burns indigo, so the two never
// read as the same object.
export interface SunPalette {
  lit: string
  peak: string
  ember: string
  glowStrong: string
  glowMid: string
  glowSoft: string
}

const GOLD: SunPalette = {
  lit: '#e8c87e',
  peak: '#f0d89a',
  ember: '#5a3a24',
  glowStrong: 'rgba(232,200,126,1)',
  glowMid: 'rgba(232,200,126,0.95)',
  glowSoft: 'rgba(232,200,126,0.75)',
}

export const INSIGHT_PALETTE: SunPalette = {
  lit: '#9a96dd',
  peak: '#b8b4ee',
  ember: '#2f2b4a',
  glowStrong: 'rgba(125,120,215,1)',
  glowMid: 'rgba(125,120,215,0.95)',
  glowSoft: 'rgba(125,120,215,0.7)',
}

export function applySunFx(
  nodes: SunNodes,
  state: SunState,
  reduce: boolean,
  anims: Map<string, Animation>,
  key: string,
  p: SunPalette = GOLD,
) {
  const { core, halo, label } = nodes
  anims.get(key)?.cancel()
  anims.delete(key)

  const setLit = () => {
    core.classList.add('lit')
    core.classList.remove('dead')
    core.style.removeProperty('fill')
    halo.classList.add('lit')
    label?.classList.add('lit')
    label?.classList.remove('dead')
  }
  const setDead = () => {
    core.classList.add('dead')
    core.classList.remove('lit')
    core.style.removeProperty('fill')
    halo.classList.remove('lit')
    label?.classList.add('dead')
    label?.classList.remove('lit')
  }

  if (state === 'lit') return setLit()
  if (state === 'dead') return setDead()
  if (reduce) return state === 'dying' ? setDead() : setLit()

  if (state === 'dying') {
    // Flare (halo swells, core flashes) then collapse to a cold ember.
    setLit()
    halo.classList.remove('lit') // stop breathing; animate manually
    halo.animate(
      [
        { transform: 'scale(1)', opacity: 0.6 },
        { transform: 'scale(2)', opacity: 0.85, offset: 0.28 },
        { transform: 'scale(0)', opacity: 0 },
      ],
      { duration: 1500, easing: EASE, fill: 'forwards' },
    )
    const a = core.animate(
      [
        { fill: p.lit, filter: `drop-shadow(0 0 8px ${p.glowMid})`, transform: 'scale(1.3)' },
        { fill: p.peak, filter: `drop-shadow(0 0 12px ${p.glowStrong})`, transform: 'scale(1.45)', offset: 0.22 },
        { fill: p.ember, filter: 'none', transform: 'scale(0.66)', offset: 0.72 },
        { fill: '#0a0a10', filter: 'none', transform: 'scale(1)' },
      ],
      { duration: 1500, easing: EASE, fill: 'forwards' },
    )
    anims.set(key, a)
    a.finished.then(() => { setDead(); a.cancel(); anims.delete(key) }).catch(() => {})
    return
  }

  // kindling — a gentle bloom back to life.
  setDead()
  core.classList.remove('dead')
  halo.animate(
    [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: 1200, easing: EASE, fill: 'forwards' },
  )
  const a = core.animate(
    [
      { fill: '#0a0a10', filter: 'none', transform: 'scale(1)' },
      { fill: p.lit, filter: `drop-shadow(0 0 12px ${p.glowStrong})`, transform: 'scale(1.35)', offset: 0.6 },
      { fill: p.lit, filter: `drop-shadow(0 0 6px ${p.glowSoft})`, transform: 'scale(1)' },
    ],
    { duration: 1200, easing: EASE, fill: 'forwards' },
  )
  anims.set(key, a)
  a.finished.then(() => { setLit(); a.cancel(); anims.delete(key) }).catch(() => {})
}
