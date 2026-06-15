import { useEffect, useRef } from 'react'

const ASPECT = 181.54816 / 116.77534  // SVG height ÷ width

const LOGO_DEFS = [
  { w: 40, speed: 0.50, opacity: 0.22 },
  { w: 52, speed: 0.32, opacity: 0.18 },
  { w: 34, speed: 0.62, opacity: 0.25 },
  { w: 30, speed: 0.48, opacity: 0.20 },
  { w: 46, speed: 0.55, opacity: 0.22 },
  { w: 38, speed: 0.40, opacity: 0.18 },
  { w: 28, speed: 0.68, opacity: 0.24 },
  { w: 44, speed: 0.38, opacity: 0.20 },
  { w: 36, speed: 0.52, opacity: 0.22 },
  { w: 50, speed: 0.30, opacity: 0.17 },
  { w: 32, speed: 0.60, opacity: 0.23 },
  { w: 42, speed: 0.44, opacity: 0.19 },
]

export default function FloatingLogos() {
  const imgRefs = useRef([])
  const stateRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const W = window.innerWidth
    const H = window.innerHeight

    stateRef.current = LOGO_DEFS.map(def => {
      const h = def.w * ASPECT
      const angle = Math.random() * Math.PI * 2
      return {
        w: def.w,
        h,
        x: Math.random() * Math.max(1, W - def.w),
        y: Math.random() * Math.max(1, H - h),
        vx: Math.cos(angle) * def.speed,
        vy: Math.sin(angle) * def.speed,
      }
    })

    function tick() {
      const W = window.innerWidth
      const H = window.innerHeight
      stateRef.current.forEach((logo, i) => {
        logo.x += logo.vx
        logo.y += logo.vy

        if (logo.x <= 0)           { logo.x = 0;            logo.vx =  Math.abs(logo.vx) }
        if (logo.x + logo.w >= W)  { logo.x = W - logo.w;  logo.vx = -Math.abs(logo.vx) }
        if (logo.y <= 0)           { logo.y = 0;            logo.vy =  Math.abs(logo.vy) }
        if (logo.y + logo.h >= H)  { logo.y = H - logo.h;  logo.vy = -Math.abs(logo.vy) }

        const el = imgRefs.current[i]
        if (el) {
          el.style.left = `${logo.x}px`
          el.style.top  = `${logo.y}px`
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="floating-logos-container">
      {LOGO_DEFS.map((def, i) => (
        <img
          key={i}
          ref={el => { imgRefs.current[i] = el }}
          src="/intuit-logo.svg"
          alt=""
          className="floating-logo"
          style={{ width: def.w, opacity: def.opacity }}
        />
      ))}
    </div>
  )
}
