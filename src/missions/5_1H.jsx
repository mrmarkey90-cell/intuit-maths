import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function factorsOf(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }
function isPrime(n) { if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false; return true }

const PRIMES_TO_15 = [2, 3, 5, 7, 11, 13]
const COMPOSITES_TO_15 = [4, 6, 8, 9, 10, 12, 14, 15]

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

// ── Screen 1: How many factors does N have? ───────────────────────────────────

function genFactorCountQ() {
  const n = rnd(2, 15)
  const answer = factorsOf(n).length
  const wrongs = new Set()
  while (wrongs.size < 2) {
    const w = Math.max(1, answer + pick([-1, 1, 2, -2]))
    if (w !== answer) wrongs.add(w)
  }
  return { n, answer, options: shuffle([answer, ...[...wrongs]]) }
}

function FactorCountRound({ n, answer, options, onComplete }) {
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
      <div className="mission-title" style={{ fontSize: 'clamp(44px, 10vw, 72px)', margin: 0 }}>{n}</div>
      <div className="mission-seq-opts">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S1FactorCount({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genFactorCountQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genFactorCountQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.5_1H.great') : t('mission.1H.howManyFactors')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <FactorCountRound key={roundKey} {...q} onComplete={advance} />
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

// ── Screen 2: Teach — primes to 13 appear one by one ─────────────────────────

const TEACH_ENTRIES = [
  { n: 2,  example: '1 × 2' },
  { n: 3,  example: '1 × 3' },
  { n: 4,  example: '1 × 4, 2 × 2', notPrime: true },
  { n: 5,  example: '1 × 5' },
  { n: 6,  example: '1 × 6, 2 × 3', notPrime: true },
  { n: 7,  example: '1 × 7' },
  { n: 11, example: '1 × 11' },
  { n: 13, example: '1 × 13' },
]

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = TEACH_ENTRIES.map((_, i) => setTimeout(() => setRevealed(i + 1), 600 + i * 550))
    return () => timers.forEach(clearTimeout)
  }, [])

  const done = revealed >= TEACH_ENTRIES.length

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_1H.watch')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vw, 8px)', width: '100%', maxWidth: '400px' }}>
          {TEACH_ENTRIES.map(({ n, example, notPrime }, i) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.2vw, 12px)',
              opacity: i < revealed ? 1 : 0, transition: 'opacity 0.3s ease-in',
              padding: 'clamp(3px, 0.6vw, 6px) 0'
            }}>
              <span style={{
                minWidth: 'clamp(26px, 5vw, 38px)', textAlign: 'center',
                fontSize: 'clamp(14px, 2.5vw, 22px)', fontWeight: 700,
                color: notPrime ? '#dc2626' : '#4f46e5',
                background: notPrime ? '#fee2e2' : '#eef2ff',
                borderRadius: 6, padding: '2px 6px'
              }}>{n}</span>
              <span style={{ fontSize: 'clamp(11px, 1.8vw, 16px)', color: '#6b7280' }}>{example}</span>
              <span style={{
                marginLeft: 'auto', fontSize: 'clamp(11px, 1.8vw, 16px)', fontWeight: 700,
                color: notPrime ? '#dc2626' : '#15803d'
              }}>
                {notPrime ? '✗' : '✓ PRIME'}
              </span>
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

// ── Screen 3: "Is this prime?" Yes / No ──────────────────────────────────────

function genIsPrimeQ() {
  const n = rnd(2, 15)
  return { n, prime: isPrime(n) }
}

function S3IsPrime({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genIsPrimeQ)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { n, prime } = q

  function choose(yes) {
    if (fb || done) return
    const correct = yes === prime
    setFb({ yes, correct })
    setTimeout(() => {
      setFb(null)
      if (correct && count + 1 >= TOTAL) {
        setDone(true)
      } else {
        if (correct) setCount(c => c + 1)
        setQ(genIsPrimeQ())
      }
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === prime) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-title" style={{ visibility: done ? 'hidden' : 'visible', fontSize: 'clamp(44px, 10vw, 72px)' }}>
          {n}
        </div>
        <div className="mission-title">
          {done ? t('mission.5_1H.great') : t('mission.1H.isPrime')}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <button className={btnCls(true)} style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }} onClick={() => choose(true)} disabled={!!fb}>
            {t('mission.1H.yesBtn')}
          </button>
          <button className={btnCls(false)} style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }} onClick={() => choose(false)} disabled={!!fb}>
            {t('mission.1H.noBtn')}
          </button>
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

// ── Screen 4: Spot the prime — 4 tiles, 1 prime ───────────────────────────────

function genSpotPrimeQ() {
  const correct = pick(PRIMES_TO_15)
  const wrong = shuffle(COMPOSITES_TO_15).slice(0, 3)
  return { correct, values: shuffle([correct, ...wrong]) }
}

function SpotRound({ correct, values, onComplete }) {
  const [picked, setPicked] = useState(null)
  function choose(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === correct), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === correct) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div className="mission-spot-grid">
      {values.map(v => (
        <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
      ))}
    </div>
  )
}

function S4SpotPrime({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genSpotPrimeQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genSpotPrimeQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.5_1H.great') : t('mission.1H.spotPrime')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <SpotRound key={roundKey} {...q} onComplete={advance} />
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

// ── Screen 5: Multi-select — which are prime? (test) ─────────────────────────

function genMultiPrimeQ() {
  let values
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rnd(2, 15))
    values = [...pool]
  } while (!values.some(isPrime) || values.every(isPrime))
  return { values }
}

function MultiPrimeQ({ q, onComplete }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(isPrime))

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
      <div className="mission-subtitle">{t('mission.1H.whichArePrime')}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function S5MultiSelect({ onFinish }) {
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genMultiPrimeQ)
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { onFinish(); return }
    if (correct) setCount(c => c + 1)
    setQ(genMultiPrimeQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <MultiPrimeQ key={roundKey} q={q} onComplete={advance} />
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
        <div className="mission-complete-icon">⭐</div>
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

export default function Mission5_1H({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1H' })
    setStep(5)
  }

  if (step === 0) return <S1FactorCount onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3IsPrime onNext={() => setStep(3)} />
  if (step === 3) return <S4SpotPrime onNext={() => setStep(4)} />
  if (step === 4) return <S5MultiSelect onFinish={finish} />
  return <Complete onDone={onComplete} />
}
