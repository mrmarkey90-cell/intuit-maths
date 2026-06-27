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

// ── Reusable: compare two numbers, tap the bigger ────────────────────────────

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

// ── Screen 1: compare pairs with different tens digits ───────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  return (
    <Compare2
      step={1}
      genPairs={() => Array.from({ length: 4 }, () => {
        let t1 = rnd(1, 8), t2 = rnd(1, 9)
        while (t2 === t1) t2 = rnd(1, 9)
        return shuffle([t1 * 10 + rnd(0, 9), t2 * 10 + rnd(0, 9)])
      })}
      title={t('mission.2A.whichBigger')}
      doneTip={t('mission.2_2A.tensTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 2: compare pairs with the SAME tens digit ─────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  return (
    <Compare2
      step={2}
      genPairs={() => Array.from({ length: 4 }, () => {
        const tens = rnd(1, 9) * 10
        let u1 = rnd(0, 9), u2 = rnd(0, 9)
        while (u1 === u2) u2 = rnd(0, 9)
        return shuffle([tens + u1, tens + u2])
      })}
      title={t('mission.2_2A.sameTensTitle')}
      doneTip={t('mission.2_2A.unitsTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 3: fill the gap — mix of +1 and +10 sequences ─────────────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => {
    const by10 = Math.random() < 0.5
    const step = by10 ? 10 : 1
    const start = by10 ? rnd(1, 5) * 10 : rnd(10, 55)
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

// ── Screen 4: drag-sort 4 two-digit numbers ───────────────────────────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const values = useMemo(() => {
    const zones = [[10, 32], [33, 55], [56, 78], [79, 99]]
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

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2A.sortIt')}</div>
        <div className="mission-sort-slots">
          {Array.from({ length: 4 }, (_, i) => (
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
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: allPlaced ? 'visible' : 'hidden' }}>
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

// ── Screen 5: where does it go? (insert into sorted row of 3) ────────────────

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
          {row.map((n, i) => (
            <div key={i} className="mission-gap-box">{n}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          {zones.map((label, i) => (
            <button
              key={i}
              className={`mission-ba-btn${fb ? i === correct ? ' mission-ba-btn--correct' : i === fb.chosen && !fb.ok ? ' mission-ba-btn--wrong' : '' : ''}`}
              style={{ width: '100%', height: 'auto', padding: '0.7rem 0.4rem', fontSize: 'clamp(0.8rem, 1.8vw, 1rem)', lineHeight: 1.3 }}
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

function genWhereRounds() {
  return Array.from({ length: 3 }, () => {
    const zones = [[10, 32], [33, 55], [56, 78], [79, 99]]
    const vals = shuffle(zones.map(([lo, hi]) => rnd(lo, hi))).sort((a, b) => a - b)
    const ti = rnd(0, 3)
    const target = vals[ti]
    const row = vals.filter((_, i) => i !== ti)
    return { target, row, correct: ti }
  })
}

export default function Mission2_2A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)
  const whereRounds = useMemo(genWhereRounds, [])

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_2A' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 rounds={whereRounds} onFinish={finish} />
  return <Complete onDone={onComplete} />
}
