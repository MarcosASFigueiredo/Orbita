import { useEffect, useRef } from 'react'
import type * as THREE from 'three'

// Obsidian night sky rendered with Three.js: layered parallax stars, a faint
// gold-dust spiral galaxy, additive nebulae, breathing twinkle layers, and rare
// gold shooting stars, with the camera dollying on scroll. Lazy-loaded and
// client-only (dynamic import inside the effect keeps it out of SSR and the
// initial bundle). Frozen entirely under prefers-reduced-motion; a lighter tier
// runs on small screens. Everything is disposed on unmount.
export function Cosmos() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return

    let cleanup = () => {}
    let cancelled = false

    const build = async () => {
      const T = await import('three')
      if (cancelled || !canvasRef.current) return

      // Graceful degradation: full scene on capable desktops, a lighter tier on
      // weak machines (few cores / little memory), a minimal tier on phones
      // (no galaxy / nebula / shooters).
      const cores = navigator.hardwareConcurrency ?? 8
      const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8
      const mobile = window.innerWidth < 720
      const weak = cores <= 4 || mem <= 4
      const cfg = mobile
        ? { far: 1100, near: 320, twinkle: 90, galaxy: 0, nebula: false, shooters: false, dpr: 1.5 }
        : weak
          ? { far: 1600, near: 400, twinkle: 120, galaxy: 3000, nebula: true, shooters: true, dpr: 1.5 }
          : { far: 2600, near: 700, twinkle: 220, galaxy: 7000, nebula: true, shooters: true, dpr: 1.75 }

      const renderer = new T.WebGLRenderer({ canvas, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.dpr))
      renderer.setClearColor(0x050507, 1)

      const scene = new T.Scene()
      scene.fog = new T.FogExp2(0x050507, 0.00048)
      const camera = new T.PerspectiveCamera(58, 1, 0.1, 4000)
      camera.position.set(0, 30, 430)

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight)
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
      }
      resize()

      const disposables: { dispose: () => void }[] = []
      const track = <O extends { dispose: () => void }>(o: O) => (disposables.push(o), o)

      const sprite = (stops: [number, string][]) => {
        const c = document.createElement('canvas')
        c.width = c.height = 64
        const g = c.getContext('2d')!
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
        stops.forEach(([o, col]) => gr.addColorStop(o, col))
        g.fillStyle = gr
        g.fillRect(0, 0, 64, 64)
        return track(new T.CanvasTexture(c))
      }
      const starTex = sprite([[0, 'rgba(255,250,235,1)'], [0.4, 'rgba(240,230,205,0.4)'], [1, 'rgba(240,230,205,0)']])
      const nebIndigo = sprite([[0, 'rgba(93,90,158,0.2)'], [1, 'rgba(93,90,158,0)']])
      const nebGold = sprite([[0, 'rgba(201,165,88,0.13)'], [1, 'rgba(201,165,88,0)']])

      const stars = (count: number, spread: number, size: number, op: number) => {
        const geo = track(new T.BufferGeometry())
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * spread
        geo.setAttribute('position', new T.BufferAttribute(pos, 3))
        const mat = track(
          new T.PointsMaterial({ size, map: starTex, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending }),
        )
        return new T.Points(geo, mat)
      }
      const far = stars(cfg.far, 3200, 2.6, 0.65)
      const near = stars(cfg.near, 1500, 5, 0.85)
      scene.add(far, near)

      let gal: THREE.Points | null = null
      if (cfg.galaxy) {
        const count = cfg.galaxy
        const arms = 3
        const radius = 560
        const geo = track(new T.BufferGeometry())
        const pos = new Float32Array(count * 3)
        const col = new Float32Array(count * 3)
        const core = new T.Color(0xe8c87e)
        const mid = new T.Color(0xc9a558)
        const rim = new T.Color(0x5d5a9e)
        for (let i = 0; i < count; i++) {
          const r = Math.pow(Math.random(), 0.62) * radius
          const a = ((i % arms) / arms) * Math.PI * 2 + r * 0.008 + (Math.random() - 0.5) * 0.4
          const jx = (Math.random() - 0.5) * 44 * (1 - r / radius)
          const jy = (Math.random() - 0.5) * 20 * (1 - (r / radius) * 0.55)
          pos[i * 3] = Math.cos(a) * r + jx
          pos[i * 3 + 1] = jy
          pos[i * 3 + 2] = Math.sin(a) * r + jx
          const t = r / radius
          const c = t < 0.4 ? core.clone().lerp(mid, t / 0.4) : mid.clone().lerp(rim, (t - 0.4) / 0.6)
          col[i * 3] = c.r
          col[i * 3 + 1] = c.g
          col[i * 3 + 2] = c.b
        }
        geo.setAttribute('position', new T.BufferAttribute(pos, 3))
        geo.setAttribute('color', new T.BufferAttribute(col, 3))
        const mat = track(
          new T.PointsMaterial({ size: 3, map: starTex, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, blending: T.AdditiveBlending }),
        )
        gal = new T.Points(geo, mat)
        gal.position.set(-230, -150, -780)
        gal.rotation.set(0.6, 0, 0.12)
        scene.add(gal)
      }

      const nebGroups: THREE.Group[] = []
      if (cfg.nebula) {
        const nebula = (tex: THREE.Texture, n: number, center: [number, number, number], spread: number, sMin: number, sMax: number) => {
          const grp = new T.Group()
          for (let i = 0; i < n; i++) {
            const mat = track(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.45 + Math.random() * 0.3 }))
            const s = new T.Sprite(mat)
            s.position.set(center[0] + (Math.random() - 0.5) * spread, center[1] + (Math.random() - 0.5) * spread * 0.5, center[2] + (Math.random() - 0.5) * spread)
            const size = sMin + Math.random() * (sMax - sMin)
            s.scale.set(size, size, 1)
            grp.add(s)
          }
          scene.add(grp)
          nebGroups.push(grp)
          return grp
        }
        nebula(nebIndigo, 13, [-420, 170, -560], 520, 190, 430)
        nebula(nebIndigo, 10, [540, -110, -640], 460, 170, 380)
        nebula(nebGold, 7, [70, 300, -860], 420, 150, 320)
      }

      const twinkleA = stars(cfg.twinkle, 1400, 7, 0.9)
      const twinkleB = stars(cfg.twinkle, 1400, 6, 0.9)
      scene.add(twinkleA, twinkleB)

      // shooting stars (disposed on death — no leak)
      type Shooter = { line: THREE.Line; mat: THREE.LineBasicMaterial; p: THREE.Vector3; dir: THREE.Vector3; speed: number; life: number; maxLife: number; len: number }
      const shooters: Shooter[] = []
      const spawnShooter = () => {
        const geo = new T.BufferGeometry()
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3))
        const mat = new T.LineBasicMaterial({ color: 0xe8c87e, transparent: true, opacity: 0 })
        const line = new T.Line(geo, mat)
        const dir = new T.Vector3(-1 - Math.random() * 0.6, -0.5 - Math.random() * 0.4, 0).normalize()
        shooters.push({ line, mat, p: new T.Vector3((Math.random() - 0.5) * 1600, 200 + Math.random() * 400, -300 - Math.random() * 500), dir, speed: 420 + Math.random() * 260, life: 0, maxLife: 1.4 + Math.random() * 0.8, len: 70 + Math.random() * 60 })
        scene.add(line)
      }
      let nextShooter = 2 + Math.random() * 4

      let mx = 0
      let my = 0
      let scrollP = 0
      const onMouse = (e: MouseEvent) => {
        mx = e.clientX / window.innerWidth - 0.5
        my = e.clientY / window.innerHeight - 0.5
      }
      const onScroll = () => {
        scrollP = Math.min(1, window.scrollY / (window.innerHeight * 0.9))
      }
      window.addEventListener('resize', resize)
      window.addEventListener('mousemove', onMouse)
      window.addEventListener('scroll', onScroll, { passive: true })

      const startT = performance.now()
      const now = () => (performance.now() - startT) / 1000
      let prevT = 0
      let raf = 0
      const loop = () => {
        raf = requestAnimationFrame(loop)
        const t = now()
        const dt = Math.min(0.05, t - prevT)
        prevT = t

        if (gal) gal.rotation.y = t * 0.014
        far.rotation.y = t * 0.003
        near.rotation.y = -t * 0.0045
        ;(twinkleA.material as THREE.PointsMaterial).opacity = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.7))
        ;(twinkleB.material as THREE.PointsMaterial).opacity = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.53 + 2.1))
        twinkleA.rotation.y = -t * 0.002
        twinkleB.rotation.y = t * 0.0025
        nebGroups.forEach((g, i) => {
          g.position.x += Math.sin(t * 0.05 + i * 2) * 0.06
          g.position.y += Math.cos(t * 0.04 + i) * 0.04
        })

        const targX = mx * 46
        const targY = 30 - my * 32 - scrollP * 70
        const targZ = 430 + scrollP * 130
        camera.position.x += (targX - camera.position.x) * 0.02
        camera.position.y += (targY - camera.position.y) * 0.02
        camera.position.z += (targZ - camera.position.z) * 0.03
        camera.lookAt(0, 10 - scrollP * 40, -300)

        if (cfg.shooters) {
          nextShooter -= dt
          if (nextShooter <= 0 && shooters.length < 3) {
            spawnShooter()
            nextShooter = 4 + Math.random() * 7
          }
          for (let i = shooters.length - 1; i >= 0; i--) {
            const s = shooters[i]
            s.life += dt
            s.p.addScaledVector(s.dir, s.speed * dt)
            const tail = s.p.clone().addScaledVector(s.dir, -s.len)
            const arr = (s.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
            arr[0] = tail.x; arr[1] = tail.y; arr[2] = tail.z
            arr[3] = s.p.x; arr[4] = s.p.y; arr[5] = s.p.z
            s.line.geometry.attributes.position.needsUpdate = true
            const k = s.life / s.maxLife
            s.mat.opacity = k < 0.15 ? (k / 0.15) * 0.85 : Math.max(0, 0.85 * (1 - (k - 0.15) / 0.85))
            if (s.life >= s.maxLife) {
              scene.remove(s.line)
              s.line.geometry.dispose()
              s.mat.dispose()
              shooters.splice(i, 1)
            }
          }
        }

        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(loop)

      // Stop rendering entirely while the tab is hidden (battery), and resume
      // without a time jump.
      const onVisibility = () => {
        cancelAnimationFrame(raf)
        if (!document.hidden) {
          prevT = now()
          raf = requestAnimationFrame(loop)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        window.removeEventListener('mousemove', onMouse)
        window.removeEventListener('scroll', onScroll)
        document.removeEventListener('visibilitychange', onVisibility)
        shooters.forEach((s) => {
          s.line.geometry.dispose()
          s.mat.dispose()
        })
        disposables.forEach((d) => d.dispose())
        renderer.dispose()
      }
    }

    // Defer the import + WebGL setup until the browser is idle, so the 724 kB
    // three.js download and scene construction never compete with hydration of
    // the panel itself (they used to land inside the initial-load window and
    // showed up as long tasks). A timeout guarantees it still runs on browsers
    // without requestIdleCallback or that stay busy.
    const ric = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      }
    ).requestIdleCallback
    let idleId = 0
    let timerId = 0
    if (ric) idleId = ric(() => void build(), { timeout: 2500 })
    else timerId = window.setTimeout(() => void build(), 300)

    return () => {
      cancelled = true
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback
      if (idleId && cic) cic(idleId)
      if (timerId) clearTimeout(timerId)
      cleanup()
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full" />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 24%, transparent 34%, rgba(5,5,7,0.82) 100%)',
        }}
      />
    </>
  )
}
