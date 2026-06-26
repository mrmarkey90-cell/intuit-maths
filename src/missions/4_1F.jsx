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

// ── Screen 1: sequence completion warm-up ─────────────────────────────────────

function genSeqRound() {
  const startIdx = rnd(1, 8)
  const shown = [1, 2, 3].map(i => (startIdx + i - 1) * TABLE)
  const answer = (startIdx + 3) * TABLE
  const options = [answer, answer - 1, answer + TABLE].sort(() => Math.random() - 0.5)
  return { shown, answer, options }
}

function SeqRound({ shown, answer, options, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked) return
    setPicked(v)
    setTimeout(() => onComplete(v === answer), 700)
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

function S1Sequence({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genSeqRound)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function onComplete(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genSeqRound())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1F.great') : t('mission.4_1F.countIn')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SeqRound key={roundKey} {...q} onComplete={onComplete} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
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

// ── Screen 2: animated multiples strip (2 rows of 5) ─────────────────────────

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
          {[multiples.slice(0, 5), multiples.slice(5)].map((row, rowIdx) => (
            <div key={rowIdx} className="mission-multiples-row">
              {row.map((m, colIdx) => {
                const gi = rowIdx * 5 + colIdx
                return (
                  <span key={m} className={`mission-multiples-chip${gi < revealed ? ' mission-multiples-chip--lit' : ''}`}>{m}</span>
                )
              })}
            </div>
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

// ── Screen 3: True/False — is this in the 3 times table? ─────────────────────

function genTFQ() {
  if (Math.random() < 0.5) return { n: rnd(1, 10) * TABLE, isMultiple: true }
  let n
  do { n = rnd(1, MAX_VAL) } while (n % TABLE === 0)
  return { n, isMultiple: false }
}

function TrueFalseScreen({ step, onDone }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genTFQ)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { n, isMultiple } = q

  function pickYN(yes) {
    if (fb || done) return
    const correct = yes === isMultiple
    setFb({ yes, correct })
    setTimeout(() => {
      setFb(null)
      if (correct && count + 1 >= TOTAL) {
        setDone(true)
      } else {
        if (correct) setCount(c => c + 1)
        setQ(genTFQ())
      }
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === isMultiple) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  const questionText = `${t('mission.1F.isItPrefix')}${TABLE}${t('mission.1F.isItSuffix')}`

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1F.great') : questionText}
        </div>
        <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)', visibility: done ? 'hidden' : 'visible' }}>
          {n}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <button className={btnCls(true)} style={{ fontSize: 'clamp(16px, 3vw, 24px)' }} onClick={() => pickYN(true)} disabled={!!fb}>
            {t('mission.1F.yes')}
          </button>
          <button className={btnCls(false)} style={{ fontSize: 'clamp(16px, 3vw, 24px)' }} onClick={() => pickYN(false)} disabled={!!fb}>
            {t('mission.1F.no')}
          </button>
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 4: Spot the multiple — 4 tiles, 1 correct ─────────────────────────

function genSpotQ() {
  const used = new Set()
  const mult = rnd(1, 10) * TABLE
  used.add(mult)
  const nonMults = []
  while (nonMults.length < 3) {
    const v = rnd(1, MAX_VAL)
    if (!used.has(v) && v % TABLE !== 0) { used.add(v); nonMults.push(v) }
  }
  return { values: [mult, ...nonMults].sort(() => Math.random() - 0.5), correct: mult }
}

function SpotRound({ values, correct, onComplete }) {
  const [picked, setPicked] = useState(null)
  function pick(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === correct), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === correct) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked && v !== correct) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div className="mission-spot-grid">
      {values.map(v => (
        <button key={v} className={cls(v)} onClick={() => pick(v)} disabled={picked !== null}>{v}</button>
      ))}
    </div>
  )
}

function SpotScreen({ step, findPrompt, onDone }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genSpotQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genSpotQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.4_1F.great') : findPrompt}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SpotRound key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 5: Multi-select (test) ─────────────────────────────────────────────

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
  function check() {
    const allCorrect = [...correctSet].every(v => selected.has(v)) && [...selected].every(v => correctSet.has(v))
    setSubmitted(true)
    setTimeout(() => onComplete(allCorrect), 1000)
  }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '380px' }}>
      <div className="mission-subtitle">{findPrompt}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function MultiScreen({ step, findPrompt, onDone }) {
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genMultiQ)
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { onDone(); return }
    if (correct) setCount(c => c + 1)
    setQ(genMultiQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <MultiQ key={roundKey} q={q} findPrompt={findPrompt} onComplete={advance} />
        <RoundDots total={TOTAL} current={count} />
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
  if (step === 2) return <TrueFalseScreen step={3} onDone={() => setStep(3)} />
  if (step === 3) return <SpotScreen step={4} findPrompt={findPrompt} onDone={() => setStep(4)} />
  if (step === 4) return <MultiScreen key="m5" step={5} findPrompt={findPrompt} onDone={finish} />
  return <Complete onDone={onComplete} />
}
