import { useState, useMemo, useRef } from 'react'
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

// ── Screen 1: Tap the smallest of 3 numbers (1–15) ───────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    const s = new Set(); while (s.size < 3) s.add(rnd(1, 15)); return [...s]
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const opts = rounds[Math.min(ri, rounds.length - 1)]
  const target = Math.min(...opts)

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
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.1_2A.great')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.2A.tapSmallest')}</div>
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
