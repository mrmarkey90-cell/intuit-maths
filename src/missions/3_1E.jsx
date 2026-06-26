import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

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

function LastDigit({ n, revealed }) {
  const s = String(n)
  const prefix = s.slice(0, -1)
  const last = s.slice(-1)
  const isEven = n % 2 === 0
  const lastCls = revealed
    ? (isEven ? 'mission-lastdigit-last mission-lastdigit-last--even' : 'mission-lastdigit-last mission-lastdigit-last--odd')
    : 'mission-lastdigit-last'
  return (
    <div className="mission-lastdigit">
      {prefix && <span className="mission-lastdigit-prefix">{prefix}</span>}
      <span className={lastCls}>{last}</span>
    </div>
  )
}

function DigitStrips() {
  const { t } = useTranslation()
  return (
    <div className="mission-digit-strips">
      <div className="mission-digit-strip-row">
        <span className="mission-digit-strip-label">{t('mission.even')}:</span>
        {[0, 2, 4, 6, 8].map(d => (
          <span key={d} className="mission-digit-tile mission-digit-tile--even">{d}</span>
        ))}
      </div>
      <div className="mission-digit-strip-row">
        <span className="mission-digit-strip-label">{t('mission.odd')}:</span>
        {[1, 3, 5, 7, 9].map(d => (
          <span key={d} className="mission-digit-tile mission-digit-tile--odd">{d}</span>
        ))}
      </div>
    </div>
  )
}

function EvenOddBtns({ n, onComplete }) {
  const { t } = useTranslation()
  const [fb, setFb] = useState(null)
  function pick(isEven) {
    if (fb) return
    setFb({ isEven, correct: isEven === (n % 2 === 0) })
    setTimeout(onComplete, 700)
  }
  function cls(isEven) {
    if (!fb) return 'mission-bigger-btn'
    if (isEven === (n % 2 === 0)) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.isEven === isEven) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }
  return (
    <div className="mission-bigger-row">
      <button className={cls(true)} style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }} onClick={() => pick(true)} disabled={!!fb}>
        {t('mission.even')}
      </button>
      <button className={cls(false)} style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }} onClick={() => pick(false)} disabled={!!fb}>
        {t('mission.odd')}
      </button>
    </div>
  )
}

// ── Screen 1: Warm-up — "Which are in the 2 times table?" ────────────────────

function genWarmupQ() {
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(1, 20))
    values = [...pool]
  } while (!values.some(v => v % 2 === 0) || values.every(v => v % 2 === 0))
  return values
}

function WarmupGrid({ values, onComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(values.filter(v => v % 2 === 0))

  function toggle(v) {
    if (submitted) return
    setSelected(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n })
  }
  function check() { setSubmitted(true); setTimeout(onComplete, 1000) }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '380px' }}>
      <div className="mission-eo-grid">
        {values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function S1MultiWarmup({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genWarmupQ), [])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)

  function advance() {
    if (idx + 1 >= qs.length) setDone(true)
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.3_1E.great2Table') : t('mission.3_1E.whichIn2Table')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <WarmupGrid key={idx} values={qs[idx]} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={qs.length} current={idx} />
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

// ── Screen 2: Digit strip + animated example teach ───────────────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => {
    const e = rnd(2, 28) * 2
    const even = e < 10 ? e + 10 : e
    const o = rnd(1, 15) * 2 - 1
    const odd = o < 10 ? o + 10 : o
    return Math.random() < 0.5 ? [even, odd] : [odd, even]
  }, [])
  const [exIdx, setExIdx] = useState(0)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1400)
    const t3 = setTimeout(() => setPhase(3), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [exIdx])

  const n = examples[exIdx]
  const isEven = n % 2 === 0

  function handleNext() {
    if (exIdx < examples.length - 1) setExIdx(i => i + 1)
    else onNext()
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1E.watchLastDigit')}</div>
        <DigitStrips />
        <div style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}>
          <LastDigit n={n} revealed={phase >= 2} />
        </div>
        <div className="mission-subtitle" style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}>
          {isEven ? `→ ${t('mission.even')}` : `→ ${t('mission.odd')}`}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={handleNext} style={{ visibility: phase >= 3 ? 'visible' : 'hidden' }}>
          {exIdx < examples.length - 1 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Last-digit classify ─────────────────────────────────────────────

function SingleClassify({ step, onDone }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => rnd(1, 30)), [])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const n = qs[Math.min(idx, qs.length - 1)]

  function onAnswer() {
    setRevealed(true)
    if (idx + 1 >= qs.length) {
      setTimeout(onDone, 600)
    } else {
      setTimeout(() => { setRevealed(false); setIdx(i => i + 1) }, 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1E.isItEven')}</div>
        <LastDigit n={n} revealed={revealed} />
        <EvenOddBtns key={idx} n={n} onComplete={onAnswer} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
    </div>
  )
}

// ── Screen 4: Spot the even — 4 tiles, 1 correct ─────────────────────────────

function genSpotEven() {
  const used = new Set()
  const even = rnd(1, 15) * 2
  used.add(even)
  const odds = []
  while (odds.length < 3) {
    const v = rnd(1, 30)
    if (!used.has(v) && v % 2 !== 0) { used.add(v); odds.push(v) }
  }
  return { values: [even, ...odds].sort(() => Math.random() - 0.5), correct: even }
}

function SpotRound({ values, correct, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(onComplete, 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === correct) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked && v !== correct) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div className="mission-spot-grid">
      {values.map(v => (
        <button key={v} className={cls(v)} onClick={() => pick(v)} disabled={picked !== null}>{v}</button>
      ))}
    </div>
  )
}

function SpotScreen({ step, onDone }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 4 }, genSpotEven), [])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)

  function advance() {
    if (idx + 1 >= qs.length) setDone(true)
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.3_1E.greatSpotting') : t('mission.1E.spotEven')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SpotRound key={idx} {...qs[idx]} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={qs.length} current={idx} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 5: Multi-select grid (test) ───────────────────────────────────────

function genMultiQ() {
  const wantEven = Math.random() < 0.5
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(1, 30))
    values = [...pool]
  } while (
    !values.some(v => (v % 2 === 0) === wantEven) ||
    values.every(v => (v % 2 === 0) === wantEven)
  )
  return { values, wantEven }
}

function MultiQ({ q, onComplete }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(v => (v % 2 === 0) === q.wantEven))

  function toggle(v) {
    if (submitted) return
    setSelected(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n })
  }
  function check() { setSubmitted(true); setTimeout(onComplete, 1000) }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  const prompt = q.wantEven ? t('mission.3_1E.findEven') : t('mission.3_1E.findOdd')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '380px' }}>
      <div className="mission-subtitle">{prompt}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function MultiScreen({ step, onDone }) {
  const qs = useMemo(() => Array.from({ length: 3 }, genMultiQ), [])
  const [idx, setIdx] = useState(0)

  function advance() {
    if (idx + 1 >= qs.length) onDone()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <MultiQ key={idx} q={qs[idx]} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
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
        <div className="mission-complete-icon">🎯</div>
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

export default function Mission3_1E({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_1E' })
    setStep(5)
  }

  if (step === 0) return <S1MultiWarmup onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <SingleClassify step={3} onDone={() => setStep(3)} />
  if (step === 3) return <SpotScreen step={4} onDone={() => setStep(4)} />
  if (step === 4) return <MultiScreen key="m5" step={5} onDone={finish} />
  return <Complete onDone={onComplete} />
}
