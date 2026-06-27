import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function factorsOf(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }

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

// ── Screen 1: Complete the factor pair ────────────────────────────────────────

function genPairQ() {
  let n, innerFactors
  do {
    n = rnd(6, 24)
    innerFactors = factorsOf(n).filter(x => x !== 1 && x !== n)
  } while (innerFactors.length === 0)
  const f = pick(innerFactors)
  const answer = n / f
  const candidates = []
  for (let x = 2; x <= n; x++) if (x !== answer && n % x !== 0) candidates.push(x)
  const wrong = shuffle(candidates).slice(0, 2)
  return { n, f, answer, options: shuffle([answer, ...wrong]) }
}

function PairRound({ n, f, answer, options, onComplete }) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState(null)
  function choose(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === answer), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-seq-opt'
    if (v === answer) return 'mission-seq-opt mission-seq-opt--correct'
    if (v === picked) return 'mission-seq-opt mission-seq-opt--wrong'
    return 'mission-seq-opt'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 14px)' }}>
        <span className="mission-seq-num">{f}</span>
        <span style={{ fontSize: 'clamp(22px, 4.5vw, 36px)', color: '#6b7280' }}>×</span>
        <div className={`mission-seq-blank${picked === answer ? ' mission-seq-blank--filled' : ''}`}>
          {picked === answer ? answer : '?'}
        </div>
        <span style={{ fontSize: 'clamp(22px, 4.5vw, 36px)', color: '#6b7280' }}>=</span>
        <span className="mission-seq-num">{n}</span>
      </div>
      <div className="mission-seq-opts">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S1FactorPair({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genPairQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genPairQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.1G.great') : t('mission.1G.completeThePair')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <PairRound key={roundKey} {...q} onComplete={advance} />
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

// ── Screen 2: Animated factor pairs teach ─────────────────────────────────────

function factorPairs(n) {
  const pairs = []
  for (const f of factorsOf(n)) { if (f <= n / f) pairs.push([f, n / f]) }
  return pairs
}

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const n = useMemo(() => pick([12, 16, 18, 20]), [])
  const pairs = useMemo(() => factorPairs(n), [n])
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = pairs.map((_, i) => setTimeout(() => setRevealed(i + 1), 600 + i * 700))
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  const done = revealed >= pairs.length

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.1G.pairsMultiply')}{n}:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 10px)', alignItems: 'center' }}>
          {pairs.map(([a, b], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 14px)',
              opacity: i < revealed ? 1 : 0, transition: 'opacity 0.35s ease-in'
            }}>
              <span className="mission-multiples-chip mission-multiples-chip--lit">{a}</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', color: '#6b7280' }}>×</span>
              <span className="mission-multiples-chip mission-multiples-chip--lit">{b}</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', color: '#6b7280' }}>= {n}</span>
            </div>
          ))}
        </div>
        <div className="mission-subtitle" style={{ visibility: done ? 'visible' : 'hidden' }}>
          ✨ {t('mission.1G.findAll')}{n}
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

// ── Screens 3–5: Multi-select factor finder ───────────────────────────────────

function genFactorQ(min, max) {
  let n, factors
  do {
    n = rnd(min, max)
    factors = factorsOf(n)
  } while (factors.length > 5)
  const nonFactors = []
  for (let i = 2; i <= n + 2; i++) if (n % i !== 0) nonFactors.push(i)
  const distractors = shuffle(nonFactors).slice(0, 6 - factors.length)
  const values = shuffle([...factors, ...distractors])
  return { n, values }
}

function FactorMultiQ({ q, onComplete }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(v => q.n % v === 0))

  function toggle(v) {
    if (submitted) return
    setSelected(s => { const ns = new Set(s); if (ns.has(v)) ns.delete(v); else ns.add(v); return ns })
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
      <div className="mission-subtitle">{t('mission.1G.findAll')}{q.n}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function FactorScreen({ step, min, max, total, onDone }) {
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(() => genFactorQ(min, max))
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= total) { onDone(); return }
    if (correct) setCount(c => c + 1)
    setQ(genFactorQ(min, max))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <FactorMultiQ key={roundKey} q={q} onComplete={advance} />
        <RoundDots total={total} current={count} />
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

export default function Mission4_1G({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_1G' })
    setStep(5)
  }

  if (step === 0) return <S1FactorPair onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <FactorScreen step={3} min={6} max={11} total={3} onDone={() => setStep(3)} />
  if (step === 3) return <FactorScreen step={4} min={10} max={15} total={4} onDone={() => setStep(4)} />
  if (step === 4) return <FactorScreen key="test" step={5} min={6} max={15} total={3} onDone={finish} />
  return <Complete onDone={onComplete} />
}
