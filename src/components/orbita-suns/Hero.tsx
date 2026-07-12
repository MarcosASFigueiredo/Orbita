import { useEffect, useRef } from 'react'

// Full-screen astrolabe hero shown at the top of every visit. The astrolabe
// tilts toward the cursor and parallaxes on scroll as it leaves the viewport;
// it stays in normal flow and simply scrolls away. It is never collapsed/hidden
// (the per-session hide-after-scroll behavior was removed). Frozen under
// prefers-reduced-motion. Renders identically on server and client, so it adds
// no layout shift.
export function Hero() {
  const astroRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  // Cursor tilt + scroll parallax (astrolabe rises/shrinks/fades, text leaves
  // faster). The rAF reads scrollY directly each frame; skipped under
  // reduced-motion.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let mx = 0
    let my = 0
    let raf = 0
    const onMouse = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
    }
    const tick = () => {
      const sp = Math.min(1, window.scrollY / (window.innerHeight * 0.75))
      const astro = astroRef.current
      const text = textRef.current
      if (astro) {
        const tiltX = -my * 10
        const tiltY = mx * 14
        astro.style.transform = `perspective(900px) translateY(${sp * 90}px) scale(${1 - sp * 0.22}) rotateX(${tiltX * (1 - sp)}deg) rotateY(${tiltY * (1 - sp)}deg)`
        astro.style.opacity = String(1 - sp * 0.85)
      }
      if (text) {
        text.style.transform = `translateY(${sp * 46}px)`
        text.style.opacity = String(1 - sp * 1.05)
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMouse)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <section className="relative flex min-h-[58vh] flex-col items-center justify-center px-5 pb-10 pt-16 text-center">
      <div
        ref={astroRef}
        className="relative mb-8 aspect-square w-[min(300px,68vw)] [transform-style:preserve-3d] [will-change:transform]"
      >
        <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="heroCorona" cx="50%" cy="50%">
              <stop offset="35%" stopColor="rgba(232,200,126,0.5)" />
              <stop offset="60%" stopColor="rgba(201,165,88,0.14)" />
              <stop offset="100%" stopColor="rgba(201,165,88,0)" />
            </radialGradient>
          </defs>
          <g className="hero-ring-slow" fill="none" stroke="rgba(201,165,88,0.22)">
            <circle cx="200" cy="200" r="192" strokeWidth="0.7" />
            <circle cx="200" cy="200" r="186" strokeWidth="0.4" strokeDasharray="1 6" />
          </g>
          <g className="hero-ring-mid" fill="none" stroke="rgba(201,165,88,0.3)">
            <circle cx="200" cy="200" r="150" strokeWidth="0.6" strokeDasharray="40 8 2 8" />
            <path d="M200,50 L213,88 L200,76 L187,88 Z" fill="rgba(201,165,88,0.5)" stroke="none" />
          </g>
          <g className="hero-ring-fast" fill="none" stroke="rgba(93,90,158,0.4)">
            <circle cx="200" cy="200" r="112" strokeWidth="0.5" strokeDasharray="2 10" />
          </g>
          <circle className="hero-corona" cx="200" cy="200" r="76" fill="url(#heroCorona)" />
          <circle cx="200" cy="200" r="46" fill="#07070c" />
          <circle cx="200" cy="200" r="46" fill="none" stroke="rgba(232,200,126,0.85)" strokeWidth="1.4" />
          <circle cx="200" cy="200" r="52" fill="none" stroke="rgba(201,165,88,0.2)" strokeWidth="0.6" />
        </svg>
      </div>

      <div ref={textRef} className="[will-change:transform,opacity]">
        <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[var(--color-gold)]">
          Sob a luz dos seis sóis
        </p>
        <h1 className="font-display text-[clamp(38px,6.5vw,72px)] font-medium leading-none tracking-[0.14em] text-[var(--color-starlight)]">
          ORBITA SUNS
        </h1>
        <p className="mt-4 font-serif text-[clamp(15px,2vw,19px)] italic text-[var(--color-text-2)]">
          O que vocês salvarem da luz, atravessará a noite.
        </p>
        <div className="mx-auto mt-10 h-[52px] w-px bg-gradient-to-b from-[var(--color-gold-dim)] to-transparent" />
      </div>
    </section>
  )
}
