import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

function Progress({ step }) {
  return (
    <div className="mission-progress">
      <div className="mission-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
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

function DotRow({ count, color, visible = true }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'clamp(6px,1.2vw,10px)',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.35s ease',
    }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{
          display: 'inline-block',
          width: 'clamp(20px,4vw,32px)',
          height: 'clamp(20px,4vw,32px)',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
      ))}
    </div>
  )
}

// ── Warm-up: visual count → pick the double ───────────────────────────────────

function genWarmUp() {
  const n = rnd(1, 4)
  const correct = n * 2
  const candidates = [...new Set(
    [n, correct - 1, correct + 1, correct + 2, correct - 2].filter(v => v > 0 && v !== correct)
  )]
  while (candidates.length < 3) {
    const v = rnd(1, 10)
    if (v !== correct && !candidates.includes(v)) candidates.push(v)
  }
  return { n, opts: shuffle([correct, ...shuffle(candidates).slice(0, 3)]) }
}

function Intro({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genWarmUp), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { n, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    const correct = rounds[ri].n * 2
    setFb({ opt, ok: opt === correct })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onDone()
      else setRi(r => r + 1)
    }, 700)
  }

  const correct = rounds[Math.min(ri, rounds.length - 1)].n * 2

  return (
    <div className="mission-screen">
      <RoundDots total={rounds.length} current={ri} />
      <div className="mission-body">
        <div className="mission-title">{t('mission.7A.howManyDouble')}</div>
        <div style={{ margin: '0.5rem 0 0.8rem' }}>
          <DotRow count={n} color="#f59e0b" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, clamp(72px,16vw,120px))', gap: '0.6rem' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Teaching: two equal groups animation ──────────────────────────────────────

function Demo({ onDone }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 3 }, () => rnd(2, 5)), [])
  const [ei, setEi] = useState(0)
  const [phase, setPhase] = useState(0) // 0=first row, 1=second row, 2=answer

  const n = examples[ei]
  const total = n * 2

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 900)
    const t2 = setTimeout(() => setPhase(2), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ei])

  function next() {
    if (ei + 1 >= examples.length) onDone()
    else setEi(e => e + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <RoundDots total={examples.length} current={ei} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.7A.watchDouble')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px,1.5vw,14px)', alignItems: 'center', width: '100%' }}>

          {/* First group */}
          <DotRow count={n} color="#f59e0b" />

          {/* Plus sign — reserved space so layout stays stable */}
          <div style={{
            fontSize: 'clamp(20px,4vw,30px)',
            fontWeight: 800,
            color: '#6b7280',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}>+</div>

          {/* Second group */}
          <DotRow count={n} color="#22c55e" visible={phase >= 1} />

          {/* Answer reveal */}
          <div style={{
            minHeight: 'clamp(44px,8vw,60px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '0.2rem',
          }}>
            {phase >= 2 && (
              <div style={{
                background: '#eef2ff',
                borderRadius: 12,
                padding: '0.4rem 1.2rem',
                fontSize: 'clamp(22px,5vw,38px)',
                fontWeight: 800,
                color: '#4338ca',
                textAlign: 'center',
              }}>
                {t('mission.7A.double')} {n} = {total} ✨
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={next} style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}>
          {ei + 1 < examples.length ? t('mission.next') : t('mission.7A.tryIt')}
        </button>
      </div>
    </div>
  )
}

// ── Test: double numbers 1–8 ─────────────────────────────────────────────────

function genTest() {
  const n = rnd(1, 8)
  const correct = n * 2
  const candidates = [...new Set(
    [n, correct - 2, correct - 1, correct + 1, correct + 2, correct + 4]
      .filter(v => v > 0 && v !== correct && v <= 18)
  )]
  while (candidates.length < 3) {
    const v = rnd(1, 18)
    if (v !== correct && !candidates.includes(v)) candidates.push(v)
  }
  return { n, correct, opts: shuffle([correct, ...shuffle(candidates).slice(0, 3)]) }
}

function Quiz({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 6 }, genTest), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { n, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === correct })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onDone()
      else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <RoundDots total={rounds.length} current={ri} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.7A.doubleIt')}</div>
        <div style={{
          background: '#f0f2ff',
          borderRadius: 14,
          padding: '0.5rem 1.5rem',
          fontSize: 'clamp(28px,6.5vw,50px)',
          fontWeight: 800,
          textAlign: 'center',
          margin: '0.5rem 0 0.8rem',
          color: '#1e1b4b',
        }}>
          {t('mission.7A.double')} {n} = ?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, clamp(72px,16vw,120px))', gap: '0.6rem' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Complete ──────────────────────────────────────────────────────────────────

function Complete({ onDone }) {
  const { t } = useTranslation()
  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-complete-icon">✨</div>
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

export default function Mission1_7A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_7A' })
    setStep(3)
  }

  if (step === 0) return <Intro onDone={() => setStep(1)} />
  if (step === 1) return <Demo onDone={() => setStep(2)} />
  if (step === 2) return <Quiz onDone={finish} />
  return <Complete onDone={onComplete} />
}
