import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

function genQ() {
  const whole = rnd(1, 9)
  const tenths = rnd(1, 9)
  const target = Math.round((whole + tenths / 10) * 10) / 10
  return { target, min: whole, max: whole + 1, step: 0.1, displayTarget: target.toFixed(1) }
}

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

// ── NumberLine: 0.1-step decimal number line ──────────────────────────────────
// min and max are integers (e.g. 4 and 5). Notches at every 0.1 interval.
// End labels only shown (min and max values). Snaps to nearest 0.1.

function NumberLine({ min, max, value, onChange, onCommit, correct = false, locked = false }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  function snapToLine(e) {
    const r = ref.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    const raw = min + pct * (max - min)
    return Math.round(raw * 10) / 10
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

  const count = Math.round((max - min) / 0.1)
  const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round((min + i * 0.1) * 10) / 10)

  function pctFor(v) { return ((v - min) / (max - min)) * 100 }

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
        {ticks.map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pctFor(v)}%` }}>
            <span className="insight-numberline-mark" />
            {(v === min || v === max) && (
              <span className="insight-numberline-label">{v}</span>
            )}
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

// ── NumberLineQuestion: interactive placement with auto-advance on correct ─────

function NumberLineQuestion({ q, onComplete }) {
  const [value, setValue] = useState(q.min)
  const [status, setStatus] = useState(null) // null | 'correct' | 'wrong'

  function commit(v) {
    if (status) return
    const ok = Math.abs(v - q.target) < 0.001
    setStatus(ok ? 'correct' : 'wrong')
    if (ok) {
      setTimeout(onComplete, 700)
    } else {
      setTimeout(() => setStatus(null), 700)
    }
  }

  return (
    <NumberLine
      min={q.min}
      max={q.max}
      value={value}
      onChange={v => { if (!status) setValue(v) }}
      onCommit={commit}
      correct={status === 'correct'}
      locked={status === 'correct'}
    />
  )
}

// ── Screen 1: Which is bigger? (1dp decimals) ─────────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(1, 9) + rnd(1, 9) / 10
      const b = rnd(1, 9) + rnd(1, 9) / 10
      if (Math.abs(a - b) > 0.05) out.push([
        Math.round(a * 10) / 10,
        Math.round(b * 10) / 10,
      ])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const aDisp = a.toFixed(1)
  const bDisp = b.toFixed(1)
  const biggerDisp = (a > b ? a : b).toFixed(1)

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
        <div className="mission-title">
          {done ? t('mission.4_1C.greatComparing') : t('mission.1_1A.whichIsBigger')}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
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
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={rounds.length} current={idx} />
        </div>
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

// ── Screen 2: Teach — watch the arrow land on the number line ─────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const example = useMemo(() => {
    const whole = rnd(2, 8), tenths = rnd(2, 8)
    const target = Math.round((whole + tenths / 10) * 10) / 10
    return { target, min: whole, max: whole + 1 }
  }, [])
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000)
    return () => clearTimeout(t1)
  }, [])

  const ticks = Array.from({ length: 11 }, (_, i) =>
    Math.round((example.min + i * 0.1) * 10) / 10
  )
  function pctFor(v) { return ((v - example.min) / (example.max - example.min)) * 100 }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4_1C.watchLine')}</div>
        <div className="mission-nl-wrap">
          <div
            className="insight-numberline-rule mission-nl-rule"
            style={{ cursor: 'default' }}
          >
            <div className="insight-numberline-line" />
            {ticks.map(v => (
              <div key={v} className="insight-numberline-notch" style={{ left: `${pctFor(v)}%` }}>
                <span className="insight-numberline-mark" />
                {(v === example.min || v === example.max || (phase >= 1 && v === example.target)) && (
                  <span
                    className="insight-numberline-label"
                    style={v === example.target ? { color: '#4f46e5', fontWeight: 800 } : undefined}
                  >
                    {v}
                  </span>
                )}
              </div>
            ))}
            <div
              className={`insight-numberline-handle${phase >= 1 ? ' insight-numberline-handle--correct' : ''}`}
              style={{
                left: `${pctFor(phase >= 1 ? example.target : example.min)}%`,
                transition: 'left 0.6s ease-out',
              }}
            >
              <span className="insight-numberline-handle-knob" />
              <span className="insight-numberline-handle-arrow">▼</span>
            </div>
          </div>
        </div>
        {phase >= 1 && (
          <div
            className="mission-ba-number"
            style={{ animation: 'mission-chip-pop 0.35s ease-out both' }}
          >
            {example.target.toFixed(1)}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Find it — 3 questions, Next button after last ───────────────────

function S3FindIt({ onNext }) {
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
        <NumberLineQuestion key={idx} q={q} onComplete={advance} />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: More practice ───────────────────────────────────────────────────

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
        <NumberLineQuestion key={idx} q={q} onComplete={advance} />
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
        <NumberLineQuestion key={idx} q={q} onComplete={advance} />
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

export default function Mission4_1C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_1C' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3FindIt onNext={() => setStep(3)} />
  if (step === 3) return <S4More onNext={() => setStep(4)} />
  if (step === 4) return <S5Final onFinish={finish} />
  return <Complete onDone={onComplete} />
}
