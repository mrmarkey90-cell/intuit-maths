import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Level 6: a is negative, b is positive, answer = a − b (always more negative)
function genQ() {
  const a = -rnd(1, 9), b = rnd(1, 9)
  return { a, b, answer: a - b, prompt: `${a} − ${b}` }
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

// ── DeepNegLine: −20 to 0, integer snap ──────────────────────────────────────
// For Level 6 where answers can reach −18. Labels at −20, −10, 0.
// handleTransition prop overrides the default CSS transition (same pattern as 5_1D).

function DeepNegLine({ value, onChange, onCommit, correct = false, locked = false, handleTransition }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)
  const MIN = -20, MAX = 0
  const LABELS = [-20, -10, 0]

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

// ── Screen 1: Positive or negative? ──────────────────────────────────────────
// 4 rounds: 2 negative results (including the level-6 target form −a−b),
// 2 positive results (−a+b where b>a, and a−b where a>b).

function S1PosNeg({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const neg = [
      () => { const a = rnd(1, 9), b = rnd(1, 9); return { expr: `-${a} − ${b}`, pos: false } },
      () => { const b = rnd(1, 7), a = rnd(b + 1, 9); return { expr: `-${a} + ${b}`, pos: false } },
    ]
    const pos = [
      () => { const a = rnd(1, 7), b = rnd(a + 1, 9); return { expr: `-${a} + ${b}`, pos: true } },
      () => { const b = rnd(1, 7), a = rnd(b + 1, 9); return { expr: `${a} − ${b}`, pos: true } },
    ]
    return [neg[0](), neg[1](), pos[0](), pos[1]()].sort(() => Math.random() - 0.5)
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const round = rounds[Math.min(idx, rounds.length - 1)]

  function pick(isPos) {
    if (fb || done) return
    const correct = isPos === round.pos
    setFb({ correct, chose: isPos })
    setTimeout(() => {
      setFb(null)
      if (idx + 1 >= rounds.length) setDone(true)
      else setIdx(i => i + 1)
    }, 700)
  }

  function btnClass(isPos) {
    if (!fb) return 'mission-bigger-btn'
    if (isPos === round.pos) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.chose === isPos) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.6_1D.greatSorting') : t('mission.6_1D.posOrNeg')}
        </div>
        <div
          className="mission-title"
          style={{
            fontSize: 'clamp(32px, 7vw, 54px)',
            visibility: done ? 'hidden' : 'visible',
          }}
        >
          {round.expr}
        </div>
        <div
          className="mission-bigger-row"
          style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}
        >
          <button
            className={btnClass(true)}
            style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}
            onClick={() => pick(true)}
            disabled={!!fb}
          >
            {t('mission.6_1D.posBtn')}
          </button>
          <button
            className={btnClass(false)}
            style={{ fontSize: 'clamp(14px, 3vw, 20px)' }}
            onClick={() => pick(false)}
            disabled={!!fb}
          >
            {t('mission.6_1D.negBtn')}
          </button>
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

// ── Screen 2: Animated teach on −20 to 0 line ────────────────────────────────
// Shows one example: handle starts at a (e.g. −5), slides left to a−b (e.g. −9).

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const example = useMemo(() => {
    const a = -rnd(3, 7), b = rnd(2, 5)
    return { a, b, answer: a - b }
  }, [])
  const [phase, setPhase] = useState(0)
  const [handlePos, setHandlePos] = useState(example.a)
  const [sliding, setSliding] = useState(false)

  useEffect(() => {
    setPhase(0)
    setSliding(false)
    setHandlePos(example.a)
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => { setSliding(true); setHandlePos(example.answer); setPhase(2) }, 1800)
    const t3 = setTimeout(() => setPhase(3), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1D.watchSub')}</div>
        <div
          className="mission-title"
          style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}
        >
          {example.a} − {example.b}
        </div>
        <DeepNegLine
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
          = {example.answer}&nbsp;&nbsp;{t('mission.6_1D.goesFurther')}
        </div>
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: phase >= 3 ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Place on the −20 to 0 line (scaffolded, visual) ────────────────

function DeepLineQ({ q, onComplete }) {
  const [value, setValue] = useState(-10)
  const [status, setStatus] = useState(null)

  function commit(v) {
    if (status) return
    const ok = v === q.answer
    setStatus(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(onComplete, 700)
    else setTimeout(() => setStatus(null), 700)
  }

  return (
    <DeepNegLine
      value={value}
      onChange={v => { if (!status) setValue(v) }}
      onCommit={commit}
      correct={status === 'correct'}
      locked={status === 'correct'}
    />
  )
}

function S3DeepLine({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onNext(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-title">{q.prompt}</div>
        <div className="mission-subtitle">{t('mission.6_1D.findOnLine')}</div>
        <DeepLineQ key={idx} q={q} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screens 4–5: numpad with fixed "−" prefix ─────────────────────────────────
// Answers are always negative. Pupil types the magnitude (digits only);
// the minus sign is shown as a fixed label to the left of the input box.

function NegNumpadQ({ q, onComplete }) {
  const [val, setVal] = useState(null)
  const [wrongVal, setWrongVal] = useState(null)
  const [padKey, setPadKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const magnitude = Math.abs(q.answer)

  function submit(input) {
    if (flashing || wrongVal !== null) return
    if (parseInt(input, 10) !== magnitude) {
      setWrongVal(input)
      setTimeout(() => { setWrongVal(null); setPadKey(k => k + 1) }, 700)
      return
    }
    setVal(input)
    setFlashing(true)
    setTimeout(onComplete, 800)
  }

  function boxCls() {
    if (flashing) return 'mission-gap-box mission-gap-box--wide mission-gap-box--correct'
    if (wrongVal !== null) return 'mission-gap-box mission-gap-box--wide mission-gap-box--wrong'
    return 'mission-gap-box mission-gap-box--wide mission-gap-box--active'
  }

  function boxVal() {
    if (flashing) return val
    if (wrongVal !== null) return wrongVal
    return '?'
  }

  return (
    <>
      <div className="mission-neg-answer">
        <span className="mission-neg-sign">−</span>
        <div className={boxCls()}>{boxVal()}</div>
      </div>
      <NumberPad
        key={padKey}
        onSubmit={submit}
        stage={1}
        disabled={flashing || wrongVal !== null}
      />
    </>
  )
}

function S4Numpad({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onNext(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-title">{q.prompt}</div>
        <div className="mission-subtitle">{t('mission.6_1D.typeAnswer')}</div>
        <NegNumpadQ key={idx} q={q} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

function S5Numpad({ onFinish }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onFinish(); else setIdx(i => i + 1) }
  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-title">{q.prompt}</div>
        <div className="mission-subtitle">{t('mission.6_1D.typeAnswer')}</div>
        <NegNumpadQ key={idx} q={q} onComplete={advance} />
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

export default function Mission6_1D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_1D' })
    setStep(5)
  }

  if (step === 0) return <S1PosNeg onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3DeepLine onNext={() => setStep(3)} />
  if (step === 3) return <S4Numpad onNext={() => setStep(4)} />
  if (step === 4) return <S5Numpad onFinish={finish} />
  return <Complete onDone={onComplete} />
}
