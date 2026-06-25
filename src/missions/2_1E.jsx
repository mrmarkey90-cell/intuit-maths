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
// Designed for small numbers (2-12) in the teach screen.
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

// Even/Odd tap buttons. Keyed by caller so fb resets on each new question.
function EvenOddBtns({ n, onComplete }) {
  const { t } = useTranslation()
  const [fb, setFb] = useState(null)
  function pick(isEven) {
    if (fb) return
    const correct = isEven === (n % 2 === 0)
    setFb({ isEven, correct })
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

// ── Screen 1: Dot grid — even or odd? ────────────────────────────────────────
// Shows small numbers (2-12) as dot pairs. Red extra dot = odd.

function S1Dots({ onNext }) {
  const { t } = useTranslation()
  const nums = useMemo(() => Array.from({ length: 4 }, () => rnd(2, 12)), [])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const n = nums[Math.min(idx, nums.length - 1)]

  function onAnswer() {
    if (idx + 1 >= nums.length) setDone(true)
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.2_1E.greatSpotting') : t('mission.2_1E.isItEven')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)' }}>{n}</div>
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <DotGrid n={n} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <EvenOddBtns key={idx} n={n} onComplete={onAnswer} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={nums.length} current={idx} />
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
// Two examples (one even, one odd), cycles with "Another one!" / "Next".
// Phases: 1 = number appears, 2 = dots appear, 3 = label, 4 = button.

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

// ── Screens 3-5: classify larger numbers (no dots) ────────────────────────────

function ClassifyScreen({ step, onDone }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => rnd(10, 50)), [])
  const [idx, setIdx] = useState(0)
  const n = qs[Math.min(idx, qs.length - 1)]

  function onAnswer() {
    if (idx + 1 >= qs.length) onDone()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2_1E.isItEven')}</div>
        <div className="mission-title" style={{ fontSize: 'clamp(48px, 11vw, 80px)' }}>
          {n}
        </div>
        <EvenOddBtns key={idx} n={n} onComplete={onAnswer} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions" />
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

  if (step === 0) return <S1Dots onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <ClassifyScreen step={3} onDone={() => setStep(3)} />
  if (step === 3) return <ClassifyScreen step={4} onDone={() => setStep(4)} />
  if (step === 4) return <ClassifyScreen step={5} onDone={finish} />
  return <Complete onDone={onComplete} />
}
