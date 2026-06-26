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

// Calls onComplete(isCorrect) after 700ms feedback.
function EvenOddBtns({ n, onComplete }) {
  const { t } = useTranslation()
  const [fb, setFb] = useState(null)
  function pick(isEven) {
    if (fb) return
    const correct = isEven === (n % 2 === 0)
    setFb({ isEven, correct })
    setTimeout(() => onComplete(correct), 700)
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

// ── Screen 1: Halving warm-up ─────────────────────────────────────────────────

function HalveRound({ n, onComplete }) {
  const correct = n / 2
  const options = useMemo(() => {
    const d1 = correct + 2
    const d2 = correct >= 3 ? correct - 2 : correct + 4
    return [correct, d1, d2].sort(() => Math.random() - 0.5)
  }, [correct])
  const [picked, setPicked] = useState(null)

  function pick(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === correct), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-seq-opt'
    if (v === correct) return 'mission-seq-opt mission-seq-opt--correct'
    if (v === picked && v !== correct) return 'mission-seq-opt mission-seq-opt--wrong'
    return 'mission-seq-opt'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(12px, 2.5vw, 20px)' }}>
      <div className="mission-title" style={{ fontSize: 'clamp(48px, 11vw, 80px)', margin: 0 }}>{n}</div>
      <div className="mission-seq-opts">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => pick(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S1Halving({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [n, setN] = useState(() => rnd(5, 20) * 2)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setN(rnd(5, 20) * 2)
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1E.greatHalving') : t('mission.4_1E.halveIt')}
        </div>
        <div className="mission-subtitle" style={{ visibility: done ? 'hidden' : 'visible' }}>
          {t('mission.4_1E.halfOf')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <HalveRound key={roundKey} n={n} onComplete={advance} />
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

// ── Screen 2: Digit strip + animated teach ───────────────────────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => {
    const e = rnd(13, 49) * 2
    const o = rnd(13, 49) * 2 - 1
    return Math.random() < 0.5 ? [e, o] : [o, e]
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
        <div className="mission-subtitle">{t('mission.4_1E.watchLastDigit')}</div>
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

// ── Screen 3: Last-digit classify (2-digit numbers) ──────────────────────────

function SingleClassify({ step, onDone }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [n, setN] = useState(() => rnd(25, 99))
  const [revealed, setRevealed] = useState(false)
  const [roundKey, setRoundKey] = useState(0)

  function onAnswer(correct) {
    setRevealed(true)
    if (correct && count + 1 >= TOTAL) {
      setTimeout(onDone, 600)
      return
    }
    setTimeout(() => {
      setRevealed(false)
      if (correct) setCount(c => c + 1)
      setN(rnd(25, 99))
      setRoundKey(k => k + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4_1E.isItEven')}</div>
        <LastDigit n={n} revealed={revealed} />
        <EvenOddBtns key={roundKey} n={n} onComplete={onAnswer} />
        <RoundDots total={TOTAL} current={count} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
    </div>
  )
}

// ── Screen 4: Spot the even (2-digit numbers) ────────────────────────────────

function genSpotEven() {
  const used = new Set()
  const even = rnd(13, 49) * 2
  used.add(even)
  const odds = []
  while (odds.length < 3) {
    const v = rnd(25, 99)
    if (!used.has(v) && v % 2 !== 0) { used.add(v); odds.push(v) }
  }
  return { values: [even, ...odds].sort(() => Math.random() - 0.5), correct: even }
}

function SpotRound({ values, correct, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === correct), 700)
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
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genSpotEven)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genSpotEven())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1E.greatSpotting') : t('mission.1E.spotEven')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SpotRound key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
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
    while (pool.size < 6) pool.add(rnd(25, 99))
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
  const prompt = q.wantEven ? t('mission.4_1E.findEven') : t('mission.4_1E.findOdd')
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
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genMultiQ)
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { onDone(); return }
    if (correct) setCount(c => c + 1)
    setQ(genMultiQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <MultiQ key={roundKey} q={q} onComplete={advance} />
        <RoundDots total={TOTAL} current={count} />
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

export default function Mission4_1E({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_1E' })
    setStep(5)
  }

  if (step === 0) return <S1Halving onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <SingleClassify step={3} onDone={() => setStep(3)} />
  if (step === 3) return <SpotScreen step={4} onDone={() => setStep(4)} />
  if (step === 4) return <MultiScreen key="m5" step={5} onDone={finish} />
  return <Complete onDone={onComplete} />
}
