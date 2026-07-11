import { useEffect } from 'react'

// Wires the scroll-in reveals and the cursor plate-tilt for whatever is on
// screen. Re-runs on route change (pass the pathname) to pick up the new
// route's plates. Both are disabled under prefers-reduced-motion; tilt is
// desktop-only (fine pointer). Nothing here depends on hover for content.
export function useCinematics(pathname: string) {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const cleanups: Array<() => void> = []

    // Staggered reveals.
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.in)'))
    if (reduce) {
      reveals.forEach((el) => el.classList.add('in'))
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io.unobserve(e.target)
            }
          })
        },
        { threshold: 0.12 },
      )
      reveals.forEach((el) => io.observe(el))
      cleanups.push(() => io.disconnect())
    }

    // Plate tilt toward the cursor — desktop, fine pointer only.
    if (!reduce && matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll<HTMLElement>('.tiltable').forEach((el) => {
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          el.style.transition = 'transform 0s'
          el.style.transform = `perspective(1100px) rotateX(${-py * 2.2}deg) rotateY(${px * 2.6}deg) translateZ(2px)`
        }
        const leave = () => {
          el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
          el.style.transform = ''
        }
        el.addEventListener('mousemove', move)
        el.addEventListener('mouseleave', leave)
        cleanups.push(() => {
          el.removeEventListener('mousemove', move)
          el.removeEventListener('mouseleave', leave)
          el.style.transform = ''
          el.style.transition = ''
        })
      })
    }

    return () => cleanups.forEach((fn) => fn())
  }, [pathname])
}
