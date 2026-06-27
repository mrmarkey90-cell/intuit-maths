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

// Dot grid showing n as pairs, with the extra dot in red if odd.
function DotGrid({ n }) {
  const pairs = Math.floor(n / 2)
  const isOdd = n % 2 === 1
  return (
    <div className="mission-dot-grid">
      {Array.from({ length: pairs }, (_, i) => (
        <div key={i} className="mission-dot-pair">
          <span className="mission-dot" />
          <span className="mission-dot" />
        </div>
      ))}
      {isOdd && (
        <div className="mission-dot-pair">
          <span className="mission-dot mission-dot--extra" />
        </div>
      )}
    </div>
  )
}

// Even/Odd tap buttons. Calls onComplete(isCorrect) after 700ms feedback.
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

// ── Screen 1: Count in 2s — sequence completion ───────────────────────────────

function genSeqRound() {
  const startIdx = rnd(1, 8)
  const shown = [1, 2, 3].map(i => (startIdx + i - 1) * 2)
  const answer = (startIdx + 3) * 2
  const options = [answer, answer - 1, answer + 1].sort(() => Math.random() - 0.5)
  return { shown, answer, options }
}

function SeqRound({ shown, answer, options, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === answer), 700)
  }
  function optCls(v) {
    if (picked === null) return 'mission-seq-opt'
    if (v === answer) return 'mission-seq-opt mission-seq-opt--correct'
    if (v === picked) return 'mission-seq-opt mission-seq-opt--wrong'
    return 'mission-seq-opt'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div className="mission-seq-row">
        {shown.map((n, i) => (
          <span key={i}><span className="mission-seq-num">{n}</span>{' → '}</span>
        ))}
        <div className={`mission-seq-blank${picked === answer ? ' mission-seq-blank--filled' : ''}`}>
          {picked === answer ? answer : '?'}
        </div>
      </div>
      <div className="mission-seq-opts">
        {options.map(v => (
          <button key={v} className={optCls(v)} onClick={() => pick(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S1Sequence({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genSeqRound)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function onComplete(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genSeqRound())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.3_1F.great') : t('mission.3_1F.countIn')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SeqRound key={roundKey} {...q} onComplete={onComplete} />
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

// ── Screen 2: Animated dot-pair teach ────────────────────────────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => {
    const evens = [4, 6, 8, 10, 12]
    const odds = [3, 5, 7, 9, 11]
    const e = evens[Math.floor(Math.random() * evens.length)]
    const o = odds[Math.floor(Math.random() * odds.length)]
    return Math.random() < 0.5 ? [e, o] : [o, e]
  }, [])
  const [exIdx, setExIdx] = useState(0)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1200)
    const t3 = setTimeout(() => setPhase(3), 2000)
    const t4 = setTimeout(() => setPhase(4), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
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
        <div className="mission-subtitle">{t('mission.2_1E.watchPairs')}</div>
        <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)', visibility: phase >= 1 ? 'visible' : 'hidden' }}>
          {n}
        </div>
        <div style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}>
          <DotGrid n={n} />
        </div>
        <div className="mission-subtitle" style={{ visibility: phase >= 3 ? 'visible' : 'hidden' }}>
          {isEven ? t('mission.2_1E.evenLabel') : t('mission.2_1E.oddLabel')}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={handleNext} style={{ visibility: phase >= 4 ? 'visible' : 'hidden' }}>
          {exIdx < examples.length - 1 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Spot the even — 4 tiles, 1 correct ─────────────────────────────

function genSpotEven() {
  const used = new Set()
  const even = rnd(1, 10) * 2
  used.add(even)
  const odds = []
  while (odds.length < 3) {
    const v = rnd(1, 20)
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
          {done ? t('mission.2_1E.greatSpotting') : t('mission.1E.spotEven')}
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

// ── Screen 4: Multi-select find even numbers ──────────────────────────────────

function genMultiMiniQ() {
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(1, 30))
    values = [...pool]
  } while (!values.some(v => v % 2 === 0) || values.every(v => v % 2 === 0))
  return values
}

function MultiMiniRound({ values, onComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(values.filter(v => v % 2 === 0))

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

function MultiMiniScreen({ step, onDone }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genMultiMiniQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genMultiMiniQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.2_1E.greatSpotting') : t('mission.2_1E.findEven')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <MultiMiniRound key={roundKey} values={q} onComplete={advance} />
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

// ── Screen 5: Classify (test) ─────────────────────────────────────────────────

function ClassifyScreen({ step, onDone }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [n, setN] = useState(() => rnd(10, 50))
  const [roundKey, setRoundKey] = useState(0)

  function onAnswer(correct) {
    if (correct && count + 1 >= TOTAL) { onDone(); return }
    if (correct) setCount(c => c + 1)
    setN(rnd(10, 50))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2_1E.isItEven')}</div>
        <div className="mission-title" style={{ fontSize: 'clamp(48px, 11vw, 80px)' }}>
          {n}
        </div>
        <EvenOddBtns key={roundKey} n={n} onComplete={onAnswer} />
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

export default function Mission2_1E({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_1E' })
    setStep(5)
  }

  if (step === 0) return <S1Sequence onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <SpotScreen step={3} onDone={() => setStep(3)} />
  if (step === 3) return <MultiMiniScreen step={4} onDone={() => setStep(4)} />
  if (step === 4) return <ClassifyScreen step={5} onDone={finish} />
  return <Complete onDone={onComplete} />
}
