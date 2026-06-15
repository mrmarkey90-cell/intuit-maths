const LOGOS = [
  { left: '4%',  top: '7%',  size: 42, duration: 24, delay: 0,   anim: 1, opacity: 0.28 },
  { left: '86%', top: '4%',  size: 54, duration: 31, delay: -9,  anim: 2, opacity: 0.22 },
  { left: '11%', top: '54%', size: 38, duration: 27, delay: -16, anim: 3, opacity: 0.26 },
  { left: '73%', top: '36%', size: 32, duration: 19, delay: -5,  anim: 4, opacity: 0.20 },
  { left: '43%', top: '73%', size: 28, duration: 36, delay: -22, anim: 1, opacity: 0.24 },
  { left: '79%', top: '66%', size: 48, duration: 23, delay: -11, anim: 2, opacity: 0.28 },
  { left: '24%', top: '17%', size: 36, duration: 29, delay: -18, anim: 3, opacity: 0.22 },
  { left: '56%', top: '11%', size: 52, duration: 21, delay: -7,  anim: 4, opacity: 0.25 },
  { left: '91%', top: '79%', size: 30, duration: 34, delay: -26, anim: 1, opacity: 0.20 },
  { left: '6%',  top: '83%', size: 44, duration: 26, delay: -13, anim: 2, opacity: 0.27 },
  { left: '37%', top: '43%', size: 34, duration: 38, delay: -31, anim: 3, opacity: 0.23 },
  { left: '61%', top: '86%', size: 40, duration: 22, delay: -20, anim: 4, opacity: 0.25 },
]

export default function FloatingLogos() {
  return (
    <div className="floating-logos-container">
      {LOGOS.map((l, i) => (
        <img
          key={i}
          src="/intuit-logo.svg"
          alt=""
          className={`floating-logo floating-logo--${l.anim}`}
          style={{
            left: l.left,
            top: l.top,
            width: l.size,
            opacity: l.opacity,
            animationDuration: `${l.duration}s`,
            animationDelay: `${l.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
