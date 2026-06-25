import { useState, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pct(v) { return ((v - 1) / 19) * 100 } // maps 1-20 → 0-100%

const ALL20 = Array.from({ length: 20 }, (_, i) => i + 1)
const LANDMARKS = [1, 5, 10, 15, 20]
const LANDMARK_TARGETS = [5, 10, 15, 20] // 1 is an endpoint, just shown

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

// 1-20 number line; only shows labels at landmark positions
function NumberLine20({ value, onChange, onCommit, correct = false, locked = false }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  function snap(e) {
    const r = ref.current.getBoundingClientRect()
    return Math.round(1 + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 19)
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
        {ALL20.map(v => (
          <div key={v} className="insight-numberline-notch" style={{ left: `${pct(v)}%` }}>
            <span className="insight-numberline-mark" />
            {LANDMARKS.includes(v) && (
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

// ── Screen 1: Which is bigger? (1-20) ────────────────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(1, 20), b = rnd(1, 20)
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
          <div className="mission-title">{t('mission.2_1A.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
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

// ── Screen 2: Tap the landmarks in order ─────────────────────────────────────

function S2Landmarks({ onNext }) {
  const { t } = useTranslation()
  const [nextIdx, setNextIdx] = useState(0)
  const [tapped, setTapped] = useState(new Set([1]))
  const done = nextIdx >= LANDMARK_TARGETS.length

  function tap(n) {
    if (done || n !== LANDMARK_TARGETS[nextIdx]) return
    setTapped(prev => new Set([...prev, n]))
    setNextIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {done ? t('mission.2_1A.landmarksDone') : t('mission.2_1A.tapLandmarks')}
        </div>
        <div className="mission-grid20">
          {ALL20.map(n => {
            const isLandmark = LANDMARKS.includes(n)
            const isTapped = tapped.has(n)
            const isPulse = !done && n === LANDMARK_TARGETS[nextIdx]
            return (
              <div
                key={n}
                className={[
                  'mission-sort-chip',
                  isLandmark ? (isTapped ? 'mission-chip-tapped' : 'mission-chip-landmark') : 'mission-chip-plain',
                  isPulse ? 'mission-chip-pulse' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => tap(n)}
              >
                {n}
              </div>
            )
          })}
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

// ── Screen 3: Fill the gap in a 5-number sequence ────────────────────────────

function S3FillGap({ onNext }) {
  const { t } = useTranslation()
  const questions = useMemo(() => {
    const qs = []
    while (qs.length < 3) {
      const start = rnd(1, 16)
      const seq = [start, start + 1, start + 2, start + 3, start + 4]
      const gapIdx = rnd(1, 3)
      qs.push({ seq, gapIdx, answer: seq[gapIdx] })
    }
    return qs
  }, [])
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(null)
  const { seq, gapIdx, answer } = questions[idx]

  function submit(val) {
    const n = parseInt(val, 10)
    const ok = n === answer
    setAttempt({ value: n, ok })
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
        <div className="mission-subtitle">{t('mission.1_1A.whatIsMissing')}</div>
        <div className="mission-gap-row">
          {seq.map((n, i) => (
            <div
              key={i}
              className={`mission-gap-box${i === gapIdx
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

// ── Screen 4: Sort 4 numbers smallest to largest ──────────────────────────────

function S4Sort({ onNext }) {
  const { t } = useTranslation()
  // One number from each landmark zone so the sort reinforces the zones
  const targets = useMemo(() => {
    const zones = [[2, 5], [6, 10], [11, 15], [16, 19]]
    return shuffle(zones.map(([a, b]) => rnd(a, b)))
  }, [])
  const sorted = useMemo(() => [...targets].sort((a, b) => a - b), [targets])
  const [source, setSource] = useState(targets)
  const [placed, setPlaced] = useState(Array(4).fill(null))
  const [drag, setDrag] = useState(null)
  const [wrongDrop, setWrongDrop] = useState(null)
  const slotRefs = useRef([])
  const allPlaced = placed.every(v => v !== null)

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
      if (drag.v === sorted[si]) {
        const newPlaced = [...placed]
        newPlaced[si] = drag.v
        setPlaced(newPlaced)
        setSource(prev => prev.filter(v => v !== drag.v))
      } else {
        setWrongDrop({ idx: si, value: drag.v })
        setTimeout(() => setWrongDrop(null), 450)
      }
    }
    setDrag(null)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.1_1A.putThemBack')}</div>
        <div className="mission-sort-slots">
          {Array.from({ length: 4 }, (_, i) => (
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
          {source.map(v => (
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
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: allPlaced ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
      {drag && (
        <div className="mission-sort-ghost mission-sort-chip" style={{ left: drag.x, top: drag.y }}>
          {drag.v}
        </div>
      )}
    </div>
  )
}

// ── Screen 5: Find X on the 1-20 line (landmarks-only labels) ────────────────
// Auto-advances on correct drop — answer not telegraphed by a button.

function S5FindX({ onFinish }) {
  const { t } = useTranslation()
  const targets = useMemo(() => {
    const pool = ALL20.filter(n => !LANDMARKS.includes(n))
    return shuffle(pool).slice(0, 3)
  }, [])
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState(1)
  const [locked, setLocked] = useState(false)
  const target = targets[idx]
  const isLast = idx + 1 >= targets.length

  function commit(v) {
    if (locked || v !== target) return
    setLocked(true)
    setTimeout(() => {
      setLocked(false)
      if (isLast) onFinish()
      else { setIdx(i => i + 1); setVal(1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-title">{t('mission.1_1A.find')} <strong>{target}</strong></div>
        <NumberLine20
          value={val}
          onChange={v => { if (!locked) setVal(v) }}
          onCommit={commit}
          correct={locked}
          locked={locked}
        />
        <RoundDots total={targets.length} current={idx} />
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

export default function Mission2_1A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_1A' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Landmarks onNext={() => setStep(2)} />
  if (step === 2) return <S3FillGap onNext={() => setStep(3)} />
  if (step === 3) return <S4Sort onNext={() => setStep(4)} />
  if (step === 4) return <S5FindX onFinish={finish} />
  return <Complete onDone={onComplete} />
}
