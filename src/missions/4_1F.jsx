import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

const TABLE = 3
const MAX_VAL = 30

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
        <span key={i} className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`} />
      ))}
    </div>
  )
}

// ── Sequence round ────────────────────────────────────────────────────────────

function SeqRound({ shown, answer, options, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked) return
    setPicked(v)
    setTimeout(onComplete, 700)
  }
  function optCls(v) {
    if (!picked) return 'mission-seq-opt'
    if (v === answer) return 'mission-seq-opt mission-seq-opt--correct'
    if (v === picked) return 'mission-seq-opt mission-seq-opt--wrong'
    return 'mission-seq-opt'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div className="mission-seq-row">
        {shown.map((n, i) => (
          <span key={i}><span className="mission-seq-num">{n}</span>{' → '}</span>
        ))}
        <div className={`mission-seq-blank${picked === answer ? ' mission-seq-blank--filled' : ''}`}>
          {picked === answer ? answer : '?'}
        </div>
      </div>
      <div className="mission-seq-opts">
        {options.map(v => (
          <button key={v} className={optCls(v)} onClick={() => pick(v)} disabled={!!picked}>{v}</button>
        ))}
      </div>
    </div>
  )
}

// ── Screen 1: sequence completion warm-up ─────────────────────────────────────

function S1Sequence({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() =>
    [1, 3, 5, 7].map(startIdx => {
      const shown = [1, 2, 3].map(i => (startIdx + i - 1) * TABLE)
      const answer = (startIdx + 3) * TABLE
      // distractors: answer ± 1 are never multiples of 3
      const options = [answer, answer - 1, answer + 1].sort(() => Math.random() - 0.5)
      return { shown, answer, options }
    })
  , [])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)

  function onComplete() {
    if (idx + 1 >= rounds.length) setDone(true)
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1F.great') : t('mission.4_1F.countIn')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SeqRound key={idx} {...rounds[idx]} onComplete={onComplete} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={rounds.length} current={idx} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: animated multiples strip ───────────────────────────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const multiples = useMemo(() => {
    const m = []
    for (let i = TABLE; i <= TABLE * 10; i += TABLE) m.push(i)
    return m
  }, [])
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = multiples.map((_, i) =>
      setTimeout(() => setRevealed(i + 1), 400 + i * 200)
    )
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  const done = revealed >= multiples.length
  const watchText = `${t('mission.1F.watchPrefix')}${TABLE}${t('mission.1F.watchSuffix')}`

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{watchText}</div>
        <div className="mission-multiples-strip">
          {multiples.map((m, i) => (
            <span key={m} className={`mission-multiples-chip${i < revealed ? ' mission-multiples-chip--lit' : ''}`}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Multi-select (screens 3-5) ────────────────────────────────────────────────

function genMultiQ() {
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(1, MAX_VAL))
    values = [...pool]
  } while (!values.some(v => v % TABLE === 0) || values.every(v => v % TABLE === 0))
  return { values }
}

function MultiQ({ q, findPrompt, onComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(v => v % TABLE === 0))

  function toggle(v) {
    if (submitted) return
    setSelected(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n })
  }
  function check() { setSubmitted(true); setTimeout(onComplete, 1000) }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  return (
    <>
      <div className="mission-subtitle">{findPrompt}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </>
  )
}

function MultiScreen({ step, findPrompt, onDone }) {
  const qs = useMemo(() => Array.from({ length: 3 }, genMultiQ), [])
  const [idx, setIdx] = useState(0)
  function advance() {
    if (idx + 1 >= qs.length) onDone()
    else setIdx(i => i + 1)
  }
  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <MultiQ key={idx} q={qs[idx]} findPrompt={findPrompt} onComplete={advance} />
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
        <div className="mission-complete-icon">✖️</div>
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

export default function Mission4_1F({ pupilId, onComplete }) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const findPrompt = `${t('mission.1F.findPrefix')}${TABLE}${t('mission.1F.findSuffix')}`

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_1F' })
    setStep(5)
  }

  if (step === 0) return <S1Sequence onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <MultiScreen step={3} findPrompt={findPrompt} onDone={() => setStep(3)} />
  if (step === 3) return <MultiScreen step={4} findPrompt={findPrompt} onDone={() => setStep(4)} />
  if (step === 4) return <MultiScreen step={5} findPrompt={findPrompt} onDone={finish} />
  return <Complete onDone={onComplete} />
}
