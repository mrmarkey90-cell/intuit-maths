import { useState, useRef, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pct(v) { return ((v - 1) / 9) * 100 } // maps 1-10 → 0-100%

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

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

// Full 1-10 number line with draggable ▼ handle.
// endLabelsOnly: only show tick labels at 1 and 10; all other ticks are bare.
// onCommit fires on pointer release with the snapped value.
function NumberLine({ value, onChange, onCommit, correct = false, locked = false, endLabelsOnly = false }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  function snap(e) {
    const r = ref.current.getBoundingClientRect()
    return Math.round(1 + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 9)
  }

  function onDown(e) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    onChange(snap(e))
  }

  function onMove(e) {
    if (!dragging) return
    onChange(snap(e))
  }

  function onUp(e) {
    if (!dragging) return
    setDragging(false)
    const v = snap(e)
    onChange(v)
    onCommit?.(v)
  }

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
        {ALL.map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pct(v)}%` }}>
            <span className="insight-numberline-mark" />
            {(!endLabelsOnly || v === 1 || v === 10) && (
              <span className="insight-numberline-label">{v}</span>
            )}
          </div>
        ))}
        <div
          className={`insight-numberline-handle${dragging ? ' insight-numberline-handle--dragging' : ''}${!dragging && correct ? ' insight-numberline-handle--correct' : ''}`}
          style={{ left: `${pct(value)}%`, transition: dragging ? 'none' : 'left 0.1s ease-out' }}
        >
          <span className="insight-numberline-handle-knob" />
          <span className="insight-numberline-handle-arrow">▼</span>
        </div>
      </div>
    </div>
  )
}

// ── Screen 1: Which is bigger? ────────────────────────────────────────────────

function S1Bigger({ onNext }) {
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(1, 10), b = rnd(1, 10)
      if (a !== b) out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null) // { bigger, chosen }
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
      {done ? (
        <>
          <div className="mission-title">You know your numbers! 🎉</div>
          <button className="mission-next-btn" onClick={onNext}>Next →</button>
        </>
      ) : (
        <>
          <div className="mission-title">Which is bigger?</div>
          <div className="mission-bigger-row">
            {[a, b].map(n => (
              <button
                key={n}
                className={`mission-bigger-btn${fb ? n === fb.bigger ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
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
  )
}

// ── Screen 2: Count and Place ─────────────────────────────────────────────────

function S2CountPlace({ onNext }) {
  const targets = useMemo(() => shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3), [])
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState(1)
  const [locked, setLocked] = useState(false)
  const target = targets[idx]
  const isCorrect = val === target

  function commit(v) {
    if (locked || v !== target) return
    setLocked(true)
    setTimeout(() => {
      setLocked(false)
      setVal(1)
      if (idx + 1 >= targets.length) onNext()
      else setIdx(i => i + 1)
    }, 600)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-subtitle">How many?</div>
      <div className="mission-dots">
        {Array.from({ length: target }, (_, i) => <span key={i} className="mission-dot" />)}
      </div>
      <NumberLine
        value={val}
        onChange={v => { if (!locked) setVal(v) }}
        onCommit={commit}
        correct={isCorrect && locked}
        locked={locked}
      />
      <RoundDots total={targets.length} current={idx} />
    </div>
  )
}

// ── Screen 3: Sort — fall then rebuild ────────────────────────────────────────

function S3Sort({ onNext }) {
  const [phase, setPhase] = useState('show') // 'show' | 'fall' | 'sort'
  const [sourceItems, setSourceItems] = useState(() => shuffle(ALL))
  const [placed, setPlaced] = useState(Array(10).fill(null)) // placed[i] = value at slot i+1
  const [drag, setDrag] = useState(null) // { v, x, y }
  const [wrongDrop, setWrongDrop] = useState(null) // { idx, value }
  const slotRefs = useRef([])

  useEffect(() => {
    if (phase === 'show') {
      const t = setTimeout(() => setPhase('fall'), 1400)
      return () => clearTimeout(t)
    }
    if (phase === 'fall') {
      const t = setTimeout(() => setPhase('sort'), 1100)
      return () => clearTimeout(t)
    }
  }, [phase])

  function findSlot(x, y) {
    for (let i = 0; i < slotRefs.current.length; i++) {
      const r = slotRefs.current[i]?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
    }
    return null
  }

  function startDrag(e, v) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ v, x: e.clientX, y: e.clientY })
  }

  function onMove(e) {
    if (!drag) return
    setDrag(d => d && { ...d, x: e.clientX, y: e.clientY })
  }

  function onUp(e) {
    if (!drag) return
    const si = findSlot(e.clientX, e.clientY)
    if (si !== null && placed[si] === null) {
      if (drag.v === si + 1) {
        setPlaced(prev => { const n = [...prev]; n[si] = drag.v; return n })
        setSourceItems(prev => prev.filter(v => v !== drag.v))
      } else {
        setWrongDrop({ idx: si, value: drag.v })
        setTimeout(() => setWrongDrop(null), 450)
      }
    }
    setDrag(null)
  }

  const allPlaced = placed.every(v => v !== null)

  if (phase !== 'sort') {
    return (
      <div className="mission-screen">
        <Progress step={3} />
        <div className="mission-subtitle" />
        <div className="mission-sort-show">
          {ALL.map((n, i) => (
            <div
              key={n}
              className={`mission-sort-chip mission-sort-chip--intro${phase === 'fall' ? ' mission-sort-chip--fall' : ''}`}
              style={{ animationDelay: phase === 'show' ? `${i * 80}ms` : `${i * 45}ms` }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-subtitle">Put them back!</div>
      <div className="mission-sort-slots">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            ref={el => { slotRefs.current[i] = el }}
            className={`mission-sort-slot${placed[i] != null ? ' mission-sort-slot--filled' : ''}${allPlaced ? ' mission-sort-slot--correct' : ''}`}
          >
            {placed[i] != null ? (
              <span className="mission-sort-chip" style={{ cursor: 'default' }}>{placed[i]}</span>
            ) : wrongDrop?.idx === i ? (
              <span className="mission-sort-chip mission-sort-chip--reject">{wrongDrop.value}</span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mission-sort-source">
        {sourceItems.map(v => (
          <div
            key={v}
            className="mission-sort-chip"
            style={{ visibility: drag?.v === v ? 'hidden' : 'visible' }}
            onPointerDown={e => startDrag(e, v)}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            {v}
          </div>
        ))}
      </div>
      {allPlaced && <button className="mission-next-btn" onClick={onNext}>Next →</button>}
      {drag && (
        <div className="mission-sort-ghost mission-sort-chip" style={{ left: drag.x, top: drag.y }}>
          {drag.v}
        </div>
      )}
    </div>
  )
}

// ── GapLine: number line with the gap position shown as "?" ──────────────────

function GapLine({ gap, attempt }) {
  return (
    <div className="mission-nl-wrap">
      <div className="insight-numberline-rule mission-nl-rule">
        <div className="insight-numberline-line" />
        {ALL.map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pct(v)}%` }}>
            <span className="insight-numberline-mark" />
            {v === gap ? (
              <span className={`insight-numberline-label mission-gap-line-label${attempt?.ok ? ' mission-gap-line-label--correct' : attempt ? ' mission-gap-line-label--wrong' : ''}`}>
                {attempt ? attempt.value : '?'}
              </span>
            ) : (
              <span className="insight-numberline-label">{v}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Screen 4: Fill the Gap ────────────────────────────────────────────────────

function S4FillGap({ onNext }) {
  const gaps = useMemo(() => shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3), [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null) // { value, ok }
  const gap = gaps[idx]

  function submit(val) {
    const n = parseInt(val, 10)
    const ok = n === gap
    setAttempt({ value: n, ok })
    if (ok) {
      setTimeout(() => {
        setAttempt(null)
        if (idx + 1 >= gaps.length) onNext()
        else setIdx(i => i + 1)
      }, 800)
    } else {
      setTimeout(() => setAttempt(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-subtitle">What number is missing?</div>
      <GapLine gap={gap} attempt={attempt} />
      <NumberPad
        key={`${idx}-${String(attempt?.ok ?? '')}`}
        onSubmit={submit}
        stage={1}
        disabled={!!attempt}
      />
    </div>
  )
}

// ── Screen 5: Find X on the line ─────────────────────────────────────────────

function S6FindX({ onFinish }) {
  const targets = useMemo(() => shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3), [])
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState(1)
  const target = targets[idx]
  const isCorrect = val === target
  const isLast = idx + 1 >= targets.length

  function advance() {
    if (!isCorrect) return
    if (isLast) onFinish()
    else { setIdx(i => i + 1); setVal(1) }
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-title">Find <strong>{target}</strong></div>
      <NumberLine value={val} onChange={setVal} correct={isCorrect} endLabelsOnly />
      <button className="mission-next-btn" onClick={advance} disabled={!isCorrect}>
        {isLast ? '🎯 Finish!' : 'Next →'}
      </button>
    </div>
  )
}

// ── Completion ────────────────────────────────────────────────────────────────

function Complete({ onDone }) {
  return (
    <div className="mission-screen">
      <div className="mission-complete-icon">🎯</div>
      <div className="mission-title">Mission Complete!</div>
      <div className="mission-complete-credits">+50 🪙</div>
      <button className="mission-next-btn" onClick={onDone}>Back to Hub</button>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Mission1_1A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_1A' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2CountPlace onNext={() => setStep(2)} />
  if (step === 2) return <S3Sort onNext={() => setStep(3)} />
  if (step === 3) return <S4FillGap onNext={() => setStep(4)} />
  if (step === 4) return <S6FindX onFinish={finish} />
  return <Complete onDone={onComplete} />
}
