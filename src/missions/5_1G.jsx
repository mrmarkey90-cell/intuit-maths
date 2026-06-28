import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function factorsOf(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Progress({ step }) {
  return (
    <div className="mission-progress">
      <div className="mission-progress-fill" style={{ width: `${(step / 5) * 100}%` }} />
    </div>
  )
}

function RoundDots({ total, current }) {
  return (
    <div className="mission-round-dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`} />
      ))}
    </div>
  )
}

// ── Screen 1: "Does N divide M exactly?" Yes / No ─────────────────────────────

function genIsDivisibleQ(excludeM = null) {
  let m
  do { m = rnd(12, 24) } while (factorsOf(m).length < 3 || m === excludeM)
  const factors = factorsOf(m)
  if (Math.random() < 0.5) {
    const inner = factors.filter(x => x !== 1 && x !== m)
    const n = inner[Math.floor(Math.random() * inner.length)]
    return { m, n, divides: true }
  } else {
    const nonFactors = []
    for (let x = 2; x <= 9; x++) if (m % x !== 0) nonFactors.push(x)
    const n = nonFactors[Math.floor(Math.random() * nonFactors.length)]
    return { m, n, divides: false }
  }
}

function S1DivisibleCheck({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genIsDivisibleQ)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { m, n, divides } = q

  function pickBtn(yes) {
    if (fb || done) return
    const correct = yes === divides
    setFb({ yes, correct })
    setTimeout(() => {
      setFb(null)
      if (correct && count + 1 >= TOTAL) {
        setDone(true)
      } else {
        if (correct) setCount(c => c + 1)
        setQ(prev => genIsDivisibleQ(prev.m))
      }
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === divides) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title" style={{ visibility: done ? 'hidden' : 'visible' }}>
          {m} ÷ {n}
        </div>
        <div className="mission-subtitle">
          {done ? t('mission.1G.great') : t('mission.1G.isAFactor')}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <button className={btnCls(true)} style={{ fontSize: 'clamp(16px, 3vw, 24px)' }} onClick={() => pickBtn(true)} disabled={!!fb}>
            {t('mission.1G.yesBtn')}
          </button>
          <button className={btnCls(false)} style={{ fontSize: 'clamp(16px, 3vw, 24px)' }} onClick={() => pickBtn(false)} disabled={!!fb}>
            {t('mission.1G.noBtn')}
          </button>
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: Teach — 5×5 grid with factors lighting up ──────────────────────

const GRID25 = Array.from({ length: 25 }, (_, i) => i + 1)

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const n = useMemo(() => [16, 18, 20, 24][Math.floor(Math.random() * 4)], [])
  const factorList = useMemo(() => factorsOf(n), [n])
  const [lit, setLit] = useState(new Set())

  useEffect(() => {
    const timers = factorList.map((f, i) =>
      setTimeout(() => setLit(prev => new Set([...prev, f])), 500 + i * 350)
    )
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  const done = lit.size >= factorList.length

  function tileCls(v) {
    if (lit.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    return 'mission-eo-tile'
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.1G.findAll')}{n}</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'clamp(3px, 0.7vw, 6px)', width: '100%', maxWidth: '300px'
        }}>
          {GRID25.map(v => (
            <button key={v} className={tileCls(v)} style={{ fontSize: 'clamp(11px, 1.8vw, 16px)' }} disabled>{v}</button>
          ))}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Tap a factor ────────────────────────────────────────────────────

function genCircleQ(excludeN = null) {
  let n
  do { n = rnd(12, 24) } while (factorsOf(n).length < 3 || n === excludeN)
  const inner = factorsOf(n).filter(x => x !== 1 && x !== n)
  const correct = pick(inner)
  const nonFactors = []
  for (let x = 2; x <= n + 5; x++) if (n % x !== 0) nonFactors.push(x)
  const wrong = shuffle(nonFactors).slice(0, 3)
  return { n, correct, options: shuffle([correct, ...wrong]) }
}

function CircleQ({ n, correct, options, onComplete }) {
  const [picked, setPicked] = useState(null)
  function choose(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === correct), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === correct) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)', margin: 0 }}>{n}</div>
      <div className="mission-spot-grid">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S3Circle({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genCircleQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(prev => genCircleQ(prev.n))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {done ? t('mission.1G.great') : t('mission.1G.tapFactor')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <CircleQ key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 4: Odd one out — which is NOT a factor? ───────────────────────────

function genOddOneOutQ(excludeN = null) {
  let n, factors, inner
  do {
    n = rnd(16, 36)
    factors = factorsOf(n)
    inner = factors.filter(x => x !== 1 && x !== n)
  } while (inner.length < 3 || n === excludeN)
  const realFactors = shuffle(inner).slice(0, 3)
  const nonFactors = []
  for (let x = 2; x < n; x++) if (n % x !== 0) nonFactors.push(x)
  const impostor = pick(nonFactors)
  return { n, impostor, options: shuffle([...realFactors, impostor]) }
}

function OddOneOutQ({ n, impostor, options, onComplete }) {
  const [picked, setPicked] = useState(null)
  function choose(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === impostor), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === impostor) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)', margin: 0 }}>{n}</div>
      <div className="mission-spot-grid">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S4OddOneOut({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genOddOneOutQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(prev => genOddOneOutQ(prev.n))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {done ? t('mission.1G.great') : t('mission.5_1G.whichNotFactor')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <OddOneOutQ key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 5: 5×5 grid test ───────────────────────────────────────────────────

function Grid25Q({ n, onComplete }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set([1]))
  const [submitted, setSubmitted] = useState(false)
  const correctSet = useMemo(() => new Set(GRID25.filter(v => n % v === 0)), [n])

  function toggle(v) {
    if (submitted || v === 1) return
    setSelected(s => { const ns = new Set(s); if (ns.has(v)) ns.delete(v); else ns.add(v); return ns })
  }
  function check() {
    const allCorrect = [...correctSet].every(v => selected.has(v)) && [...selected].every(v => correctSet.has(v))
    setSubmitted(true)
    setTimeout(() => onComplete(allCorrect), 1000)
  }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '300px' }}>
      <div className="mission-subtitle">{t('mission.1G.findAll')}{n}</div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'clamp(3px, 0.7vw, 6px)'
      }}>
        {GRID25.map(v => (
          <button key={v} className={tileCls(v)} style={{ fontSize: 'clamp(11px, 1.8vw, 16px)' }}
            onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function genGridN(min, max, excludeN = null) {
  let n
  do { n = rnd(min, max) } while (factorsOf(n).length < 3 || n === excludeN)
  return n
}

function GridScreen({ step, min, max, total, onDone }) {
  const [count, setCount] = useState(0)
  const [n, setN] = useState(() => genGridN(min, max))
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= total) { onDone(); return }
    if (correct) setCount(c => c + 1)
    setN(prev => genGridN(min, max, prev))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <Grid25Q key={roundKey} n={n} onComplete={advance} />
        <RoundDots total={total} current={count} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
    </div>
  )
}

// ── Completion ────────────────────────────────────────────────────────────────

function Complete({ onDone }) {
  const { t } = useTranslation()
  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-complete-icon">✖️</div>
        <div className="mission-title">{t('mission.complete')}</div>
        <div className="mission-complete-credits">+50 🪙</div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone}>{t('mission.backToHub')}</button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Mission5_1G({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1G' })
    setStep(5)
  }

  if (step === 0) return <S1DivisibleCheck onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3Circle onNext={() => setStep(3)} />
  if (step === 3) return <S4OddOneOut onNext={() => setStep(4)} />
  if (step === 4) return <GridScreen key="s5" step={5} min={12} max={24} total={3} onDone={finish} />
  return <Complete onDone={onComplete} />
}
