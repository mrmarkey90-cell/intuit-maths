import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Step sizes used by the Level 4 1A generator
const STEPS = [25, 30, 40]
const WRONG_OPTS = { 25: [20, 30, 40], 30: [20, 25, 40], 40: [25, 30, 50] }

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

function SeqGapRow({ terms, gapIdx, attempt }) {
  return (
    <div className="mission-gap-row">
      {terms.map((n, i) => (
        <div
          key={i}
          className={`mission-gap-box mission-gap-box--wide${i === gapIdx
            ? attempt
              ? attempt.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong'
              : ' mission-gap-box--gap'
            : ''
          }`}
        >
          {i === gapIdx ? (attempt ? attempt.value : '?') : n}
        </div>
      ))}
    </div>
  )
}

// ── Screen 1: Watch 25s build up (teaching screen) ───────────────────────────

function S1Watch({ onNext }) {
  const { t } = useTranslation()
  const SEQ = [25, 50, 75, 100, 125]
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (step < SEQ.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 900)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setReady(true), 500)
      return () => clearTimeout(timer)
    }
  }, [step])

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4_1A.watchCount')}</div>
        <div className="mission-sort-source" style={{ justifyContent: 'center', flexWrap: 'nowrap' }}>
          {SEQ.slice(0, step + 1).map(n => (
            <div key={n} className="mission-sort-chip mission-sort-chip--intro" style={{ animationDelay: '0ms', cursor: 'default' }}>
              {n}
            </div>
          ))}
        </div>
        {ready && (
          <div className="mission-subtitle" style={{ marginTop: 16 }}>
            {t('mission.4_1A.countingIn25s')}
          </div>
        )}
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

// ── Screen 2: What's the step? (3 terms shown, 4 option buttons) ─────────────

function S2WhatStep({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    // [25, 30, 40, 25] gives variety while revisiting the taught step
    return [25, 30, 40, 25].map(step => {
      const start = rnd(1, 4) * step
      const terms = [start, start + step, start + 2 * step]
      const opts = shuffle([step, ...WRONG_OPTS[step]])
      return { terms, step, opts }
    })
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { terms, step, opts } = rounds[Math.min(idx, rounds.length - 1)]

  function pick(v) {
    if (fb || done) return
    setFb({ correct: step, chosen: v })
    setTimeout(() => {
      setFb(null)
      if (idx + 1 >= rounds.length) setDone(true)
      else setIdx(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.4_1A.greatSpotting')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4_1A.whatsTheStep')}</div>
            <SeqGapRow terms={terms} gapIdx={-1} attempt={null} />
            <div className="mission-ba-opts">
              {opts.map(v => (
                <button
                  key={v}
                  className={`mission-ba-btn${fb ? v === fb.correct ? ' mission-ba-btn--correct' : v === fb.chosen ? ' mission-ba-btn--wrong' : '' : ''}`}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >
                  {v}
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

// ── Screen 3: Continue the sequence (3 terms → type the 4th) ─────────────────

function S3Continue({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() =>
    STEPS.map(step => {
      const start = rnd(1, 4) * step
      const terms = [start, start + step, start + 2 * step]
      return { terms, answer: String(start + 3 * step) }
    })
  , [])
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

  // Show the 3 terms + an empty/answered slot for the 4th
  const display = [...terms, null]

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4_1A.continueSeq')}</div>
        <SeqGapRow terms={display} gapIdx={3} attempt={attempt} />
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

// ── Screen 4: Fill the middle (4 terms, one gap in the middle) ───────────────

function S4FillMiddle({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    const out = []
    shuffle([...STEPS, ...STEPS]).slice(0, 3).forEach(step => {
      const start = rnd(1, 4) * step
      const all = [start, start + step, start + 2 * step, start + 3 * step]
      const gapIdx = rnd(1, 2) // gap at position 1 or 2 (never first or last)
      out.push({ all, gapIdx, answer: String(all[gapIdx]) })
    })
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { all, gapIdx, answer } = questions[idx]

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
        <div className="mission-subtitle">{t('mission.4_1A.fillMiddle')}</div>
        <SeqGapRow terms={all} gapIdx={gapIdx} attempt={attempt} />
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

// ── Screen 5: Continue more (3 terms → 4th, mixed step sizes, auto-finish) ───

function S5MoreContinue({ onFinish }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    return shuffle([25, 30, 40]).map(step => {
      const start = rnd(2, 5) * step
      const terms = [start, start + step, start + 2 * step]
      return { terms, answer: String(start + 3 * step) }
    })
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { terms, answer } = questions[idx]
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

  const display = [...terms, null]

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4_1A.continueSeq')}</div>
        <SeqGapRow terms={display} gapIdx={3} attempt={attempt} />
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

export default function Mission4_1A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_1A' })
    setStep(5)
  }

  if (step === 0) return <S1Watch onNext={() => setStep(1)} />
  if (step === 1) return <S2WhatStep onNext={() => setStep(2)} />
  if (step === 2) return <S3Continue onNext={() => setStep(3)} />
  if (step === 3) return <S4FillMiddle onNext={() => setStep(4)} />
  if (step === 4) return <S5MoreContinue onFinish={finish} />
  return <Complete onDone={onComplete} />
}
