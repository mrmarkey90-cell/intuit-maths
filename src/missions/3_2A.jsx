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

function Compare2({ step, genPairs, title, doneTip, onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(genPairs, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(ri, rounds.length - 1)]
  const bigger = Math.max(a, b)

  function pick(n) {
    if (fb || done) return
    setFb({ n, ok: n === bigger })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true)
      else setRi(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{doneTip}</div>
        ) : (
          <>
            <div className="mission-title">{title}</div>
            <div className="mission-bigger-row">
              {[a, b].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === bigger ? ' mission-bigger-btn--correct' : n === fb.n && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(24px, 5.5vw, 44px)' }}
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

// ── Screen 1: compare pairs that cross the hundreds boundary ─────────────────
// e.g. 87 vs 143 — one is 2-digit, one is 3-digit (or low vs high hundreds)

function S1({ onNext }) {
  const { t } = useTranslation()
  return (
    <Compare2
      step={1}
      genPairs={() => Array.from({ length: 4 }, () => {
        // One from 25-99, one from 100-200, clearly different hundreds
        return shuffle([rnd(25, 99), rnd(100, 200)])
      })}
      title={t('mission.2A.whichBigger')}
      doneTip={t('mission.3_2A.hundredsTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 2: compare pairs within the same 50-wide zone ─────────────────────
// e.g. 134 vs 162 — hundreds match, tens/units decide

function S2({ onNext }) {
  const { t } = useTranslation()
  return (
    <Compare2
      step={2}
      genPairs={() => Array.from({ length: 4 }, () => {
        const bases = [25, 75, 125]
        const base = bases[rnd(0, 2)]
        let a = rnd(base, base + 49), b = rnd(base, base + 49)
        while (a === b) b = rnd(base, base + 49)
        return shuffle([a, b])
      })}
      title={t('mission.3_2A.sameTensTitle')}
      doneTip={t('mission.2_2A.unitsTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 3: fill the gap — count by 5, 10 or 25 in range 25–200 ────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => {
    const step = [5, 10, 25][rnd(0, 2)]
    const maxStart = 200 - 4 * step
    const start = Math.ceil(25 / step) * step + rnd(0, Math.floor((maxStart - Math.ceil(25 / step) * step) / step)) * step
    const seq = [0, 1, 2, 3, 4].map(i => start + i * step)
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
            <div key={i} className={`mission-gap-box mission-gap-box--wide${i === gi ? att ? att.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong' : ' mission-gap-box--gap' : ''}`}>
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

// ── Screen 4: drag-sort 4 numbers from range 25–200 ──────────────────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const values = useMemo(() => {
    const zones = [[25, 75], [76, 120], [121, 160], [161, 200]]
    return shuffle(zones.map(([lo, hi]) => rnd(lo, hi)))
  }, [])
  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values])
  const [source, setSource] = useState(() => shuffle(values))
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
        setPlaced(p => { const n = [...p]; n[si] = drag.v; return n })
        setSource(s => s.filter(v => v !== drag.v))
      } else {
        setWrongDrop({ idx: si, value: drag.v })
        setTimeout(() => setWrongDrop(null), 450)
      }
    }
    setDrag(null)
  }

  const chipStyle = { width: 'clamp(46px, 8vw, 64px)', fontSize: 'clamp(12px, 2.2vw, 17px)' }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2A.sortIt')}</div>
        <div className="mission-sort-slots">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} ref={el => { slotRefs.current[i] = el }}
              className={`mission-sort-slot${placed[i] != null ? ' mission-sort-slot--filled' : ''}${allPlaced ? ' mission-sort-slot--correct' : ''}`}
              style={{ width: 'clamp(46px, 8vw, 64px)' }}>
              {placed[i] != null ? (
                <span className="mission-sort-chip" style={{ ...chipStyle, cursor: 'default' }}>{placed[i]}</span>
              ) : wrongDrop?.idx === i ? (
                <span className="mission-sort-chip mission-sort-chip--reject" style={chipStyle}>{wrongDrop.value}</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mission-sort-source">
          {source.map(v => (
            <div key={v} className="mission-sort-chip" style={{ ...chipStyle, visibility: drag?.v === v ? 'hidden' : 'visible' }}
              onPointerDown={e => startDrag(e, v)}
              onPointerMove={onMove}
              onPointerUp={onUp}>
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: allPlaced ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
      {drag && (
        <div className="mission-sort-ghost mission-sort-chip" style={{ ...chipStyle, left: drag.x, top: drag.y }}>
          {drag.v}
        </div>
      )}
    </div>
  )
}

// ── Screen 5: where does it go? ───────────────────────────────────────────────

function S5({ rounds, onFinish }) {
  const { t } = useTranslation()
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { target, row, correct } = rounds[ri]

  const zones = [
    `${t('mission.2A.before')} ${row[0]}`,
    `${row[0]} — ${row[1]}`,
    `${row[1]} — ${row[2]}`,
    `${t('mission.2A.after')} ${row[2]}`,
  ]

  function pick(i) {
    if (fb) return
    setFb({ chosen: i, ok: i === correct })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onFinish()
      else setRi(r => r + 1)
    }, 900)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {t('mission.2A.whereGoesPrefix')} <strong>{target}</strong> {t('mission.2A.whereGoesSuffix')}
        </div>
        <div className="mission-gap-row" style={{ pointerEvents: 'none', marginBottom: '1.2rem' }}>
          {row.map((n, i) => <div key={i} className="mission-gap-box mission-gap-box--wide">{n}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          {zones.map((label, i) => (
            <button
              key={i}
              className={`mission-ba-btn${fb ? i === correct ? ' mission-ba-btn--correct' : i === fb.chosen && !fb.ok ? ' mission-ba-btn--wrong' : '' : ''}`}
              style={{ width: '100%', height: 'auto', padding: '0.7rem 0.4rem', fontSize: 'clamp(0.75rem, 1.7vw, 0.95rem)', lineHeight: 1.3 }}
              onClick={() => pick(i)}
              disabled={!!fb}
            >{label}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

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

function genWhereRounds() {
  return Array.from({ length: 3 }, () => {
    const zones = [[25, 75], [76, 120], [121, 160], [161, 200]]
    const vals = shuffle(zones.map(([lo, hi]) => rnd(lo, hi))).sort((a, b) => a - b)
    const ti = rnd(0, 3)
    const target = vals[ti]
    const row = vals.filter((_, i) => i !== ti)
    return { target, row, correct: ti }
  })
}

export default function Mission3_2A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)
  const whereRounds = useMemo(genWhereRounds, [])

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_2A' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 rounds={whereRounds} onFinish={finish} />
  return <Complete onDone={onComplete} />
}
