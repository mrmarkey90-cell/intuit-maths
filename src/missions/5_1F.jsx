import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const TABLES = [7, 8, 9]
const MAX_VAL = 50

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

// ── Screen 1: Yes / No — is this number a multiple of [table]? ────────────────
// 4 rounds: 2 multiples, 2 non-multiples, shuffled.

function S1YesNo({ table, onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const used = new Set()
    const yes = [], no = []
    while (yes.length < 2) {
      const v = rnd(1, Math.floor(MAX_VAL / table)) * table
      if (!used.has(v)) { used.add(v); yes.push(v) }
    }
    while (no.length < 2) {
      const v = rnd(1, MAX_VAL)
      if (!used.has(v) && v % table !== 0) { used.add(v); no.push(v) }
    }
    return [...yes, ...no].sort(() => Math.random() - 0.5)
  }, [table])

  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const n = rounds[Math.min(idx, rounds.length - 1)]
  const isMultiple = n % table === 0

  function pickYN(yes) {
    if (fb || done) return
    setFb({ yes, correct: yes === isMultiple })
    setTimeout(() => {
      setFb(null)
      if (idx + 1 >= rounds.length) setDone(true)
      else setIdx(i => i + 1)
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === isMultiple) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  const questionText = `${t('mission.1F.isItPrefix')}${table}${t('mission.1F.isItSuffix')}`

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.5_1F.great') : questionText}
        </div>
        <div
          className="mission-title"
          style={{ fontSize: 'clamp(44px, 10vw, 72px)', visibility: done ? 'hidden' : 'visible' }}
        >
          {n}
        </div>
        <div
          className="mission-bigger-row"
          style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}
        >
          <button
            className={btnCls(true)}
            style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}
            onClick={() => pickYN(true)}
            disabled={!!fb}
          >
            {t('mission.1F.yes')}
          </button>
          <button
            className={btnCls(false)}
            style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}
            onClick={() => pickYN(false)}
            disabled={!!fb}
          >
            {t('mission.1F.no')}
          </button>
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

function S2Teach({ table, onNext }) {
  const { t } = useTranslation()
  const multiples = useMemo(() => {
    const m = []
    for (let i = table; i <= table * 10; i += table) m.push(i)
    return m
  }, [table])
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = multiples.map((_, i) =>
      setTimeout(() => setRevealed(i + 1), 400 + i * 200)
    )
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  const done = revealed >= multiples.length
  const watchText = `${t('mission.1F.watchPrefix')}${table}${t('mission.1F.watchSuffix')}`

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

function genMultiQ(table) {
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(1, MAX_VAL))
    values = [...pool]
  } while (!values.some(v => v % table === 0) || values.every(v => v % table === 0))
  return { values, table }
}

function MultiQ({ q, findPrompt, onComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(v => v % q.table === 0))

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

function MultiScreen({ step, table, findPrompt, onDone }) {
  const qs = useMemo(() => Array.from({ length: 3 }, () => genMultiQ(table)), [table])
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
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
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

export default function Mission5_1F({ pupilId, onComplete }) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const table = useMemo(() => pick(TABLES), [])
  const findPrompt = `${t('mission.1F.findPrefix')}${table}${t('mission.1F.findSuffix')}`

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1F' })
    setStep(5)
  }

  if (step === 0) return <S1YesNo table={table} onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach table={table} onNext={() => setStep(2)} />
  if (step === 2) return <MultiScreen key="m3" step={3} table={table} findPrompt={findPrompt} onDone={() => setStep(3)} />
  if (step === 3) return <MultiScreen key="m4" step={4} table={table} findPrompt={findPrompt} onDone={() => setStep(4)} />
  if (step === 4) return <MultiScreen key="m5" step={5} table={table} findPrompt={findPrompt} onDone={finish} />
  return <Complete onDone={onComplete} />
}
