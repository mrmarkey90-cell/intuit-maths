import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
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
        <span
          key={i}
          className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`}
        />
      ))}
    </div>
  )
}

// ── Screen 1: Which is bigger? (3-digit numbers) ─────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(100, 999), b = rnd(100, 999)
      if (a !== b) out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const bigger = Math.max(a, b)

  function pick(n) {
    if (fb || done) return
    setFb({ bigger, chosen: n })
    setTimeout(() => {
      setFb(null)
      if (idx + 1 >= rounds.length) setDone(true)
      else setIdx(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3_1A.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
            <div className="mission-bigger-row">
              {[a, b].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === fb.bigger ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(22px, 5vw, 38px)' }}
                  onClick={() => pick(n)}
                  disabled={!!fb}
                >
                  {n}
                </button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={idx} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: done ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: Watch the counter cross a boundary ──────────────────────────────
// Starts 3 before a round tens or hundreds crossing, auto-steps through 6 terms.

function S2Watch({ onNext }) {
  const { t } = useTranslation()
  // Pick a start 3 below a crossing point (end in 7 near a hundreds or plain tens)
  const start = useMemo(() => {
    const crossings = [97, 197, 297, 397, 497, 597, 697, 797, 897, 127, 247, 367, 487, 607, 727]
    return crossings[Math.floor(Math.random() * crossings.length)]
  }, [])
  const seq = useMemo(() => Array.from({ length: 6 }, (_, i) => start + i), [start])
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (step < seq.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 900)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setReady(true), 500)
      return () => clearTimeout(timer)
    }
  }, [step, seq.length])

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1A.watchIt')}</div>
        <div className="mission-ba-number" key={step}>{seq[step]}</div>
        <div className="mission-subtitle" style={{ marginTop: 12, opacity: ready ? 1 : 0, transition: 'opacity 0.4s' }}>
          {t('mission.3_1A.alwaysAddOne')}
        </div>
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: ready ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: What comes next? (show 3 terms, type the 4th) ──────────────────

function S3WhatNext({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    const qs = []
    while (qs.length < 3) {
      const start = rnd(100, 990)
      qs.push({ terms: [start, start + 1, start + 2], answer: String(start + 3) })
    }
    return qs
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { terms, answer } = questions[idx]

  function submit(val) {
    const ok = val === answer
    setAttempt({ value: val, ok })
    if (ok) {
      setTimeout(() => {
        setAttempt(null)
        if (idx + 1 >= questions.length) onNext()
        else setIdx(i => i + 1)
      }, 800)
    } else {
      setTimeout(() => setAttempt(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1A.whatComesNext')}</div>
        <div className="mission-gap-row">
          {terms.map((n, i) => (
            <div key={i} className="mission-gap-box mission-gap-box--wide">{n}</div>
          ))}
          <div className={`mission-gap-box mission-gap-box--wide${attempt ? attempt.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong' : ' mission-gap-box--gap'}`}>
            {attempt ? attempt.value : '?'}
          </div>
        </div>
        <NumberPad
          key={`${idx}-${String(attempt?.ok ?? '')}`}
          onSubmit={submit}
          stage={1}
          disabled={!!attempt}
        />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: What comes after? (mirrors the Insight question exactly) ────────

function S4WhatAfter({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    const qs = []
    while (qs.length < 3) {
      const n = rnd(350, 950)
      qs.push({ n, answer: String(n + 1) })
    }
    return qs
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { n, answer } = questions[idx]

  function submit(val) {
    const ok = val === answer
    setAttempt({ value: val, ok })
    if (ok) {
      setTimeout(() => {
        setAttempt(null)
        if (idx + 1 >= questions.length) onNext()
        else setIdx(i => i + 1)
      }, 800)
    } else {
      setTimeout(() => setAttempt(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1A.whatComesAfter')}</div>
        <div
          className="mission-ba-number"
          style={{ color: attempt ? attempt.ok ? '#16a34a' : '#dc2626' : undefined, transition: 'color 0.2s' }}
        >
          {n}
        </div>
        <NumberPad
          key={`${idx}-${String(attempt?.ok ?? '')}`}
          onSubmit={submit}
          stage={1}
          disabled={!!attempt}
        />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 5: Find the middle — "n−1, ?, n+1" ────────────────────────────────
// Deliberately targets numbers ending in 0 (tens/hundreds crossings).
// Auto-advances on the last correct answer.

function S5Middle({ onFinish }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    // Centers are multiples of 10 in range 360-940 (crosses a tens boundary)
    const out = []
    while (out.length < 3) {
      const center = rnd(36, 94) * 10
      out.push({ center, answer: String(center) })
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { center, answer } = questions[idx]
  const isLast = idx + 1 >= questions.length

  function submit(val) {
    const ok = val === answer
    setAttempt({ value: val, ok })
    if (ok) {
      setTimeout(() => {
        setAttempt(null)
        if (isLast) onFinish()
        else setIdx(i => i + 1)
      }, 800)
    } else {
      setTimeout(() => setAttempt(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3_1A.findTheMiddle')}</div>
        <div className="mission-gap-row">
          <div className="mission-gap-box mission-gap-box--wide">{center - 1}</div>
          <div className={`mission-gap-box mission-gap-box--wide${attempt ? attempt.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong' : ' mission-gap-box--gap'}`}>
            {attempt ? attempt.value : '?'}
          </div>
          <div className="mission-gap-box mission-gap-box--wide">{center + 1}</div>
        </div>
        <NumberPad
          key={`${idx}-${String(attempt?.ok ?? '')}`}
          onSubmit={submit}
          stage={1}
          disabled={!!attempt}
        />
        <RoundDots total={questions.length} current={idx} />
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

export default function Mission3_1A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_1A' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Watch onNext={() => setStep(2)} />
  if (step === 2) return <S3WhatNext onNext={() => setStep(3)} />
  if (step === 3) return <S4WhatAfter onNext={() => setStep(4)} />
  if (step === 4) return <S5Middle onFinish={finish} />
  return <Complete onDone={onComplete} />
}
