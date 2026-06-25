import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Level 5: a is negative, b is positive, answer = a + b (can be +/−)
function genQ() {
  const a = -rnd(1, 9), b = rnd(1, 9)
  return { a, b, answer: a + b }
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

// ── NegLine: −10 to 10, integer snap ─────────────────────────────────────────
// handleTransition overrides the default CSS transition on the handle element,
// so the teach screen can jump (none) or slide (left 0.8s ease-out) on demand.

function NegLine({ value, onChange, onCommit, correct = false, locked = false, handleTransition }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)
  const MIN = -10, MAX = 10
  const LABELS = [-10, 0, 10]

  function snap(e) {
    const r = ref.current.getBoundingClientRect()
    return Math.round(MIN + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (MAX - MIN))
  }
  function onDown(e) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    onChange(snap(e))
  }
  function onMove(e) { if (!dragging) return; onChange(snap(e)) }
  function onUp(e) {
    if (!dragging) return
    setDragging(false)
    const v = snap(e); onChange(v); onCommit?.(v)
  }
  function pct(v) { return (v - MIN) / (MAX - MIN) * 100 }
  const ticks = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i)
  const trans = handleTransition ?? (dragging ? 'none' : 'left 0.1s ease-out')

  return (
    <div className="mission-nl-wrap">
      <div
        className="insight-numberline-rule mission-nl-rule"
        ref={ref}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={{ cursor: locked ? 'default' : dragging ? 'grabbing' : 'grab' }}
      >
        <div className="insight-numberline-line" />
        {ticks.map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pct(v)}%` }}>
            <span className="insight-numberline-mark" />
            {LABELS.includes(v) && <span className="insight-numberline-label">{v}</span>}
          </div>
        ))}
        <div
          className={[
            'insight-numberline-handle',
            dragging ? 'insight-numberline-handle--dragging' : '',
            !dragging && correct ? 'insight-numberline-handle--correct' : '',
          ].filter(Boolean).join(' ')}
          style={{ left: `${pct(value)}%`, transition: trans }}
        >
          <span className="insight-numberline-handle-knob" />
          <span className="insight-numberline-handle-arrow">▼</span>
        </div>
      </div>
    </div>
  )
}

// ── Screen 1: Which is colder? ────────────────────────────────────────────────

function S1Colder({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      let a, b
      const type = out.length % 3
      if (type === 0) { a = -rnd(1, 9); b = rnd(1, 9) }
      else if (type === 1) { a = -rnd(1, 8); do { b = -rnd(1, 8) } while (a === b) }
      else { a = rnd(1, 9); b = -rnd(1, 9) }
      out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const colder = Math.min(a, b)

  function pick(n) {
    if (fb || done) return
    setFb({ colder, chosen: n })
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
          {done ? t('mission.5_1D.greatTemps') : t('mission.5_1D.whichIsColder')}
        </div>
        <div
          className="mission-bigger-row"
          style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}
        >
          {[a, b].map(n => (
            <button
              key={n}
              className={`mission-bigger-btn${fb ? n === fb.colder ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(20px, 5vw, 36px)' }}
              onClick={() => pick(n)}
              disabled={!!fb}
            >
              {n}°C
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

// ── Screen 2: Animated teach ──────────────────────────────────────────────────
// Shows two examples: one where answer crosses zero (positive), one stays negative.
// handle: jumps to a (no transition), then slides to answer (0.8s transition).

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => [
    (() => { const a = -rnd(1, 4); const b = rnd(Math.abs(a) + 1, 8); return { a, b, answer: a + b } })(),
    (() => { const b = rnd(1, 4); const a = -rnd(b + 1, 8); return { a, b, answer: a + b } })(),
  ], [])
  const [exIdx, setExIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const [handlePos, setHandlePos] = useState(examples[0].a)
  const [sliding, setSliding] = useState(false)

  useEffect(() => {
    const ex = examples[exIdx]
    setPhase(0)
    setSliding(false)
    setHandlePos(ex.a)
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => { setSliding(true); setHandlePos(ex.answer); setPhase(2) }, 1800)
    const t3 = setTimeout(() => setPhase(3), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [exIdx]) // eslint-disable-line

  const ex = examples[exIdx]

  function handleNext() {
    if (exIdx < examples.length - 1) setExIdx(i => i + 1)
    else onNext()
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_1D.watchAdd')}</div>
        <div
          className="mission-title"
          style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}
        >
          {ex.a} + {ex.b}
        </div>
        <NegLine
          value={handlePos}
          onChange={() => {}}
          correct={phase >= 2}
          locked
          handleTransition={sliding ? 'left 0.8s ease-out' : 'none'}
        />
        <div
          className="mission-subtitle"
          style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}
        >
          = {ex.answer}&nbsp;&nbsp;
          {ex.answer > 0 ? t('mission.5_1D.crossedZero') : t('mission.5_1D.stayedNeg')}
        </div>
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={handleNext}
          style={{ visibility: phase >= 3 ? 'visible' : 'hidden' }}
        >
          {exIdx < examples.length - 1 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Interactive line question ─────────────────────────────────────────────────

function LineQ({ q, onComplete }) {
  const [value, setValue] = useState(0)
  const [status, setStatus] = useState(null)

  function commit(v) {
    if (status) return
    const ok = v === q.answer
    setStatus(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(onComplete, 700)
    else setTimeout(() => setStatus(null), 700)
  }

  return (
    <NegLine
      value={value}
      onChange={v => { if (!status) setValue(v) }}
      onCommit={commit}
      correct={status === 'correct'}
      locked={status === 'correct'}
    />
  )
}

// ── Screens 3–5: drag to answer ───────────────────────────────────────────────

function S3Line({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onNext(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-title">{q.a} + {q.b}</div>
        <div className="mission-subtitle">{t('mission.5_1D.findAnswer')}</div>
        <LineQ key={idx} q={q} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

function S4Line({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onNext(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-title">{q.a} + {q.b}</div>
        <div className="mission-subtitle">{t('mission.5_1D.findAnswer')}</div>
        <LineQ key={idx} q={q} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

function S5Final({ onFinish }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onFinish(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-title">{q.a} + {q.b}</div>
        <div className="mission-subtitle">{t('mission.5_1D.findAnswer')}</div>
        <LineQ key={idx} q={q} onComplete={advance} />
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
        <div className="mission-complete-icon">🧊</div>
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

export default function Mission5_1D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1D' })
    setStep(5)
  }

  if (step === 0) return <S1Colder onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3Line onNext={() => setStep(3)} />
  if (step === 3) return <S4Line onNext={() => setStep(4)} />
  if (step === 4) return <S5Final onFinish={finish} />
  return <Complete onDone={onComplete} />
}
