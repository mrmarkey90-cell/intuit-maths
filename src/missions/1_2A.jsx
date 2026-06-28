import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

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

// ── Screen 1: Connect dot tiles to number tiles ───────────────────────────────

function DotGrid({ n }) {
  return (
    <div className="mission-connect-dotgrid">
      {Array.from({ length: n }, (_, i) => <span key={i} className="mission-connect-dot" />)}
    </div>
  )
}

function tileState(isConnected, isCorrect, allFilled, done) {
  if (!isConnected) return ''
  if (done) return ' mission-connect-tile--correct'
  if (allFilled) return isCorrect ? ' mission-connect-tile--correct' : ' mission-connect-tile--wrong'
  return ' mission-connect-tile--connected'
}

function S1({ onNext }) {
  const { t } = useTranslation()
  const items = useMemo(() => { const s = new Set(); while (s.size < 4) s.add(rnd(1, 10)); return [...s] }, [])
  const rightOrder = useMemo(() => shuffle(items), [items])
  const [connections, setConnections] = useState([null, null, null, null])
  const [drag, setDrag] = useState(null)
  const [lines, setLines] = useState([])
  const [done, setDone] = useState(false)
  const wrapRef = useRef(null)
  const leftRefs = useRef([])
  const rightRefs = useRef([])
  const allFilled = connections.every(v => v !== null)

  function anchorFor(el, wrapRect, side) {
    const r = el.getBoundingClientRect()
    return { x: (side === 'left' ? r.right : r.left) - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top }
  }

  function recalcLines() {
    const wrap = wrapRef.current; if (!wrap) return
    const wr = wrap.getBoundingClientRect()
    setLines(connections.map((ri, li) => {
      if (ri === null) return null
      const l = leftRefs.current[li], r = rightRefs.current[ri]
      if (!l || !r) return null
      const a = anchorFor(l, wr, 'left'), b = anchorFor(r, wr, 'right')
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, correct: rightOrder[ri] === items[li] }
    }))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    recalcLines()
    const wrap = wrapRef.current; if (!wrap) return
    const ro = new ResizeObserver(recalcLines)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [connections, done])

  function startDrag(e, li) {
    if (done) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ li, x: e.clientX, y: e.clientY })
  }
  function onMove(e) {
    if (!drag) return
    setDrag(d => d && ({ ...d, x: e.clientX, y: e.clientY }))
  }
  function rightAt(x, y) {
    for (let i = 0; i < rightRefs.current.length; i++) {
      const el = rightRefs.current[i]; if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
    }
    return null
  }
  function onUp(e) {
    if (!drag) return
    const ri = rightAt(e.clientX, e.clientY)
    if (ri !== null) {
      setConnections(prev => {
        const next = prev.map(v => (v === ri ? null : v))
        next[drag.li] = ri
        if (next.every((r, l) => r !== null && rightOrder[r] === items[l])) setDone(true)
        return next
      })
    }
    setDrag(null)
  }

  const dragLine = (() => {
    if (!drag || !wrapRef.current) return null
    const l = leftRefs.current[drag.li]; if (!l) return null
    const wr = wrapRef.current.getBoundingClientRect()
    const a = anchorFor(l, wr, 'left')
    return { x1: a.x, y1: a.y, x2: drag.x - wr.left, y2: drag.y - wr.top }
  })()

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.1_2A.great') : t('mission.2A.matchDots')}
        </div>
        <div className="mission-connect-wrap" ref={wrapRef}>
          <svg className="mission-connect-svg">
            {lines.map((ln, i) => ln && (
              <line key={i} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                stroke={done ? '#16a34a' : allFilled ? (ln.correct ? '#16a34a' : '#dc2626') : '#4f46e5'}
                strokeWidth="3.5" strokeLinecap="round"
              />
            ))}
            {dragLine && (
              <line x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2}
                stroke="#9ca3af" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round"
              />
            )}
          </svg>

          <div className="mission-connect-col">
            {items.map((n, i) => {
              const ri = connections[i]
              const correct = ri !== null && rightOrder[ri] === items[i]
              return (
                <button key={i}
                  ref={el => { leftRefs.current[i] = el }}
                  className={`mission-connect-tile${tileState(ri !== null, correct, allFilled, done)}`}
                  onPointerDown={e => startDrag(e, i)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  style={{ touchAction: 'none' }}
                  disabled={done}
                >
                  <DotGrid n={n} />
                </button>
              )
            })}
          </div>

          <div className="mission-connect-col">
            {rightOrder.map((n, i) => {
              const from = connections.indexOf(i)
              const connected = from !== -1
              const correct = connected && rightOrder[i] === items[from]
              return (
                <div key={i}
                  ref={el => { rightRefs.current[i] = el }}
                  className={`mission-connect-tile mission-connect-tile--number${tileState(connected, correct, allFilled, done)}`}
                >
                  {n}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext}
          style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: Tap the biggest of 3 numbers (1–20) ────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    const s = new Set(); while (s.size < 3) s.add(rnd(1, 20)); return [...s]
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const opts = rounds[Math.min(ri, rounds.length - 1)]
  const target = Math.max(...opts)

  function pick(n) {
    if (fb || done) return
    setFb({ n, ok: n === target })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true)
      else setRi(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.2A.great')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.2A.tapBiggest')}</div>
            <div className="mission-bigger-row">
              {opts.map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === target ? ' mission-bigger-btn--correct' : n === fb.n && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ width: 'clamp(70px, 14vw, 108px)', height: 'clamp(70px, 14vw, 108px)', fontSize: 'clamp(26px, 6vw, 46px)' }}
                  onClick={() => pick(n)}
                  disabled={!!fb}
                >{n}</button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={ri} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Fill the gap in a consecutive sequence ─────────────────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => {
    const start = rnd(1, 16)
    const seq = [0, 1, 2, 3, 4].map(i => start + i)
    const gi = rnd(1, 3)
    return { seq, gi, answer: seq[gi] }
  }), [])
  const [qi, setQi] = useState(0)
  const [att, setAtt] = useState(null)
  const { seq, gi, answer } = qs[qi]

  function submit(val) {
    const n = parseInt(val, 10)
    const ok = n === answer
    setAtt({ value: n, ok })
    if (ok) {
      setTimeout(() => { setAtt(null); qi + 1 >= qs.length ? onNext() : setQi(i => i + 1) }, 800)
    } else {
      setTimeout(() => setAtt(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2A.fillGap')}</div>
        <div className="mission-gap-row">
          {seq.map((n, i) => (
            <div key={i} className={`mission-gap-box${i === gi ? att ? att.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong' : ' mission-gap-box--gap' : ''}`}>
              {i === gi ? (att ? att.value : '?') : n}
            </div>
          ))}
        </div>
        <NumberPad key={`${qi}-${att?.ok ?? ''}`} onSubmit={submit} stage={1} disabled={!!att} />
        <RoundDots total={qs.length} current={qi} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Drag-sort screen (shared between S4 and S5) ───────────────────────────────

function DragSortScreen({ step, values, onDone }) {
  const { t } = useTranslation()
  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values])
  const [source, setSource] = useState(() => shuffle(values))
  const [placed, setPlaced] = useState(Array(values.length).fill(null))
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
        setPlaced(p => { const n = [...p]; n[si] = drag.v; return n })
        setSource(s => s.filter(v => v !== drag.v))
      } else {
        setWrongDrop({ idx: si, value: drag.v })
        setTimeout(() => setWrongDrop(null), 450)
      }
    }
    setDrag(null)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2A.sortIt')}</div>
        <div className="mission-sort-slots">
          {Array.from({ length: values.length }, (_, i) => (
            <div key={i} ref={el => { slotRefs.current[i] = el }}
              className={`mission-sort-slot${placed[i] != null ? ' mission-sort-slot--filled' : ''}${allPlaced ? ' mission-sort-slot--correct' : ''}`}>
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
            <div key={v} className="mission-sort-chip"
              style={{ visibility: drag?.v === v ? 'hidden' : 'visible' }}
              onPointerDown={e => startDrag(e, v)}
              onPointerMove={onMove}
              onPointerUp={onUp}>
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone} style={{ visibility: allPlaced ? 'visible' : 'hidden' }}>
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

// ── Screen 4: Drag-sort 3 numbers ────────────────────────────────────────────

function S4({ onNext }) {
  const values = useMemo(() => { const s = new Set(); while (s.size < 3) s.add(rnd(1, 15)); return [...s] }, [])
  return <DragSortScreen step={4} values={values} onDone={onNext} />
}

// ── Screen 5: Drag-sort 4 numbers → finish ───────────────────────────────────

function S5({ onFinish }) {
  const values = useMemo(() => { const s = new Set(); while (s.size < 4) s.add(rnd(1, 20)); return [...s] }, [])
  return <DragSortScreen step={5} values={values} onDone={onFinish} />
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

export default function Mission1_2A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_2A' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
