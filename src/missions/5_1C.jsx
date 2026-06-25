import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

function genQ() {
  const target = rnd(10, 90) / 100
  return { target, min: 0, max: 1, displayTarget: target.toFixed(2) }
}

const TOLERANCE = 0.15

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

// ── ContinuousLine: bare 0–1 number line, free drag, snaps to 0.01 ───────────

function ContinuousLine({ value, onChange, onCommit, correct = false, locked = false }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  function snapToLine(e) {
    const r = ref.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    return Math.round(pct * 100) / 100
  }

  function onDown(e) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    onChange(snapToLine(e))
  }

  function onMove(e) {
    if (!dragging) return
    onChange(snapToLine(e))
  }

  function onUp(e) {
    if (!dragging) return
    setDragging(false)
    const v = snapToLine(e)
    onChange(v)
    onCommit?.(v)
  }

  function pctFor(v) { return v * 100 }

  return (
    <div className="mission-nl-wrap">
      <div
        className="insight-numberline-rule mission-nl-rule"
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{ cursor: locked ? 'default' : dragging ? 'grabbing' : 'grab' }}
      >
        <div className="insight-numberline-line" />
        {[0, 1].map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pctFor(v)}%` }}>
            <span className="insight-numberline-mark" />
            <span className="insight-numberline-label">{v}</span>
          </div>
        ))}
        <div
          className={[
            'insight-numberline-handle',
            dragging ? 'insight-numberline-handle--dragging' : '',
            !dragging && correct ? 'insight-numberline-handle--correct' : '',
          ].filter(Boolean).join(' ')}
          style={{ left: `${pctFor(value)}%`, transition: dragging ? 'none' : 'left 0.1s ease-out' }}
        >
          <span className="insight-numberline-handle-knob" />
          <span className="insight-numberline-handle-arrow">▼</span>
        </div>
      </div>
    </div>
  )
}

// ── ContinuousLineQuestion: interactive with auto-advance on close enough ─────

function ContinuousLineQuestion({ q, onComplete }) {
  const [value, setValue] = useState(0)
  const [status, setStatus] = useState(null) // null | 'correct' | 'wrong'

  function commit(v) {
    if (status) return
    const ok = Math.abs(v - q.target) <= TOLERANCE
    setStatus(ok ? 'correct' : 'wrong')
    if (ok) {
      setTimeout(onComplete, 700)
    } else {
      setTimeout(() => setStatus(null), 700)
    }
  }

  return (
    <ContinuousLine
      value={value}
      onChange={v => { if (!status) setValue(v) }}
      onCommit={commit}
      correct={status === 'correct'}
      locked={status === 'correct'}
    />
  )
}

// ── Screen 1: Which is bigger? (2dp decimals 0.10–0.90) ───────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(10, 90) / 100
      const b = rnd(10, 90) / 100
      if (Math.abs(a - b) > 0.05) out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const aDisp = a.toFixed(2)
  const bDisp = b.toFixed(2)
  const biggerDisp = (a > b ? a : b).toFixed(2)

  function pick(n) {
    if (fb || done) return
    setFb({ biggerDisp, chosen: n })
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
          <div className="mission-title">{t('mission.5_1C.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
            <div className="mission-bigger-row">
              {[aDisp, bDisp].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === fb.biggerDisp ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

// ── Screen 2: Teach — a continuous 0–1 line with examples ────────────────────
// Shows arrow sliding to 0.25, then 0.75, so pupil gets a sense of proportion.

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState(0) // 0 = start, 1 = 0.25 shown, 2 = 0.75 shown

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const arrowPos = phase === 0 ? 0 : phase === 1 ? 0.25 : 0.75
  const label = phase === 1 ? '0.25' : phase === 2 ? '0.75' : null

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_1C.watchLine')}</div>
        <div className="mission-nl-wrap">
          <div className="insight-numberline-rule mission-nl-rule" style={{ cursor: 'default' }}>
            <div className="insight-numberline-line" />
            {[0, 1].map(v => (
              <div key={v} className="insight-numberline-notch" style={{ left: `${v * 100}%` }}>
                <span className="insight-numberline-mark" />
                <span className="insight-numberline-label">{v}</span>
              </div>
            ))}
            {label && (
              <div
                className="insight-numberline-notch"
                style={{ left: `${arrowPos * 100}%`, top: '100%', transform: 'translateX(-50%)' }}
              >
                <span
                  className="insight-numberline-label"
                  style={{ color: '#4f46e5', fontWeight: 800, position: 'static', transform: 'none', marginTop: 0 }}
                >
                  {label}
                </span>
              </div>
            )}
            <div
              className={`insight-numberline-handle${phase >= 1 ? ' insight-numberline-handle--correct' : ''}`}
              style={{ left: `${arrowPos * 100}%`, transition: 'left 0.7s ease-out' }}
            >
              <span className="insight-numberline-handle-knob" />
              <span className="insight-numberline-handle-arrow">▼</span>
            </div>
          </div>
        </div>
        {phase >= 1 && (
          <div className="mission-subtitle" style={{ animation: 'mission-chip-pop 0.35s ease-out both' }}>
            {t('mission.5_1C.estimateHint')}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Estimate — 3 questions ─────────────────────────────────────────

function S3Estimate({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onNext()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-title">
          {t('mission.1_1A.find')} <strong>{q.displayTarget}</strong>
        </div>
        <ContinuousLineQuestion key={idx} q={q} onComplete={advance} />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: More estimation ─────────────────────────────────────────────────

function S4More({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onNext()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-title">
          {t('mission.1_1A.find')} <strong>{q.displayTarget}</strong>
        </div>
        <ContinuousLineQuestion key={idx} q={q} onComplete={advance} />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 5: Final round (auto-finishes) ─────────────────────────────────────

function S5Final({ onFinish }) {
  const { t } = useTranslation()
  const questions = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onFinish()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-title">
          {t('mission.1_1A.find')} <strong>{q.displayTarget}</strong>
        </div>
        <ContinuousLineQuestion key={idx} q={q} onComplete={advance} />
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

export default function Mission5_1C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1C' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3Estimate onNext={() => setStep(3)} />
  if (step === 3) return <S4More onNext={() => setStep(4)} />
  if (step === 4) return <S5Final onFinish={finish} />
  return <Complete onDone={onComplete} />
}
