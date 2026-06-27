import { useState, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Store values as hundredths integers to avoid floating-point issues.
// Display: strip trailing ".0" so 3.50 shows as "3.5", but 3.45 stays "3.45".
function fmt(h) {
  const s = (h / 100).toFixed(2)
  return s.endsWith('0') ? s.slice(0, -1) : s
}

// Generate a hundredths integer that is either 1dp or 2dp (non-round)
function rndMixed(lo, hi) {
  if (Math.random() < 0.5) {
    // 1dp: multiple of 10
    const base = Math.ceil(lo / 10)
    const top = Math.floor(hi / 10)
    return rnd(base, top) * 10
  } else {
    // 2dp: NOT a multiple of 10
    let v = rnd(lo, hi)
    while (v % 10 === 0) v = rnd(lo, hi)
    return v
  }
}

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

// ── Screen 1: compare two mixed-precision decimals, different whole parts ─────
// e.g. 3.5 vs 7.45 — whole part is decisive (padding isn't needed yet)

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    let w1 = rnd(1, 8), w2 = rnd(1, 9)
    while (w2 === w1) w2 = rnd(1, 9)
    const a = w1 * 100 + rnd(1, 99)
    const b = w2 * 100 + rnd(1, 99)
    return shuffle([a, b])
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(ri, rounds.length - 1)]
  const bigger = Math.max(a, b)

  function pick(v) {
    if (fb || done) return
    setFb({ v, ok: v === bigger })
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
          <div className="mission-title">{t('mission.6_2A.padTip')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.2A.whichBigger')}</div>
            <div className="mission-bigger-row">
              {[a, b].map(v => (
                <button
                  key={v}
                  className={`mission-bigger-btn${fb ? v === bigger ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(20px, 4.5vw, 36px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{fmt(v)}</button>
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

// ── Screen 2: compare two mixed-precision decimals, same whole part ───────────
// e.g. 4.5 vs 4.45 — the "padding" insight: 4.5 = 4.50 > 4.45

function S2({ onNext }) {
  const { t } = useTranslation()
  // Force pairs where one is a neat 1dp and the other is 2dp in the same whole
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    const w = rnd(1, 9) * 100
    const dp1 = rnd(1, 9) * 10                   // e.g. 50 → 0.50
    let dp2 = rnd(1, 98)                          // e.g. 45 → 0.45
    while (dp2 % 10 === 0 || dp2 === dp1) dp2 = rnd(1, 98)
    return shuffle([w + dp1, w + dp2])
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(ri, rounds.length - 1)]
  const bigger = Math.max(a, b)

  function pick(v) {
    if (fb || done) return
    setFb({ v, ok: v === bigger })
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
          <div className="mission-title">{t('mission.6_2A.mixedTitle')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.2A.whichBigger')}</div>
            <div className="mission-bigger-row">
              {[a, b].map(v => (
                <button
                  key={v}
                  className={`mission-bigger-btn${fb ? v === bigger ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(20px, 4.5vw, 36px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{fmt(v)}</button>
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

// ── Screen 3: fill the gap — count by 0.25 or 0.50 ───────────────────────────
// step in hundredths: 25 = 0.25, 50 = 0.50

function S3({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => {
    const step = Math.random() < 0.5 ? 25 : 50
    // Start in 1..600 (hundredths), aligned to step
    const start = Math.round(rnd(100, 500) / step) * step
    const seq = [0, 1, 2, 3, 4].map(i => start + i * step)
    const gi = rnd(1, 3)
    return { seq, gi, answer: seq[gi] }
  }), [])
  const [qi, setQi] = useState(0)
  const [att, setAtt] = useState(null)
  const { seq, gi, answer } = qs[qi]

  function submit(val) {
    const n = Math.round(parseFloat(val) * 100)
    const ok = n === answer
    setAtt({ display: val, ok })
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
          {seq.map((v, i) => (
            <div key={i} className={`mission-gap-box${i === gi ? att ? att.ok ? ' mission-gap-box--correct' : ' mission-gap-box--wrong' : ' mission-gap-box--gap' : ''}`}>
              {i === gi ? (att ? att.display : '?') : fmt(v)}
            </div>
          ))}
        </div>
        <NumberPad key={`${qi}-${att?.ok ?? ''}`} onSubmit={submit} stage={1} allowDecimal disabled={!!att} />
        <RoundDots total={qs.length} current={qi} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: drag-sort 4 mixed-precision decimals ────────────────────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const values = useMemo(() => {
    const zones = [[101, 299], [301, 499], [501, 699], [701, 899]]
    return shuffle(zones.map(([lo, hi]) => rndMixed(lo, hi)))
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

  const chipStyle = { width: 'clamp(48px, 9vw, 68px)', fontSize: 'clamp(11px, 2.1vw, 16px)' }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2A.sortIt')}</div>
        <div className="mission-sort-slots">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} ref={el => { slotRefs.current[i] = el }}
              className={`mission-sort-slot${placed[i] != null ? ' mission-sort-slot--filled' : ''}${allPlaced ? ' mission-sort-slot--correct' : ''}`}
              style={{ width: 'clamp(48px, 9vw, 68px)' }}>
              {placed[i] != null ? (
                <span className="mission-sort-chip" style={{ ...chipStyle, cursor: 'default' }}>{fmt(placed[i])}</span>
              ) : wrongDrop?.idx === i ? (
                <span className="mission-sort-chip mission-sort-chip--reject" style={chipStyle}>{fmt(wrongDrop.value)}</span>
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
              {fmt(v)}
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
          {fmt(drag.v)}
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
    `${t('mission.2A.before')} ${fmt(row[0])}`,
    `${fmt(row[0])} — ${fmt(row[1])}`,
    `${fmt(row[1])} — ${fmt(row[2])}`,
    `${t('mission.2A.after')} ${fmt(row[2])}`,
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
          {t('mission.2A.whereGoesPrefix')} <strong>{fmt(target)}</strong> {t('mission.2A.whereGoesSuffix')}
        </div>
        <div className="mission-gap-row" style={{ pointerEvents: 'none', marginBottom: '1.2rem' }}>
          {row.map((v, i) => <div key={i} className="mission-gap-box">{fmt(v)}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', maxWidth: 380 }}>
          {zones.map((label, i) => (
            <button
              key={i}
              className={`mission-ba-btn${fb ? i === correct ? ' mission-ba-btn--correct' : i === fb.chosen && !fb.ok ? ' mission-ba-btn--wrong' : '' : ''}`}
              style={{ width: '100%', height: 'auto', padding: '0.7rem 0.4rem', fontSize: 'clamp(0.7rem, 1.5vw, 0.88rem)', lineHeight: 1.3 }}
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
    const zones = [[101, 299], [301, 499], [501, 699], [701, 899]]
    const vals = shuffle(zones.map(([lo, hi]) => rndMixed(lo, hi))).sort((a, b) => a - b)
    const ti = rnd(0, 3)
    const target = vals[ti]
    const row = vals.filter((_, i) => i !== ti)
    return { target, row, correct: ti }
  })
}

export default function Mission6_2A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)
  const whereRounds = useMemo(genWhereRounds, [])

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_2A' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 rounds={whereRounds} onFinish={finish} />
  return <Complete onDone={onComplete} />
}
