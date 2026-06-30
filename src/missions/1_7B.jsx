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

function DotRow({ count, color }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'clamp(6px,1.2vw,10px)',
      justifyContent: 'center',
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

// ── Warm-up: pelmanism (memory match) ────────────────────────────────────────

function Pelmanism({ onDone }) {
  const { t } = useTranslation()
  const [cards] = useState(() => {
    const halves = shuffle([1, 2, 3, 4, 5]).slice(0, 3)
    return shuffle(
      halves.flatMap((half, pairId) => [
        { id: pairId * 2,     pairId, type: 'question', half },
        { id: pairId * 2 + 1, pairId, type: 'answer',   half },
      ])
    )
  })
  const [matched, setMatched] = useState(new Set())
  const [flipped, setFlipped] = useState([])
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (matched.size === cards.length) {
      const id = setTimeout(onDone, 600)
      return () => clearTimeout(id)
    }
  }, [matched]) // eslint-disable-line react-hooks/exhaustive-deps

  function tap(idx) {
    if (locked || matched.has(idx) || flipped.includes(idx) || flipped.length >= 2) return
    const next = [...flipped, idx]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next
      if (cards[a].pairId === cards[b].pairId) {
        setTimeout(() => {
          setMatched(m => new Set([...m, a, b]))
          setFlipped([])
        }, 450)
      } else {
        setLocked(true)
        setTimeout(() => { setFlipped([]); setLocked(false) }, 900)
      }
    }
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-title">{t('mission.7B.findPairs')}</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, clamp(90px,17vw,130px))',
          gap: 'clamp(8px,1.5vw,14px)',
        }}>
          {cards.map((card, idx) => {
            const isMatched = matched.has(idx)
            const isUp = isMatched || flipped.includes(idx)
            const label = card.type === 'question'
              ? `${t('mission.7B.half')} ${card.half * 2}`
              : String(card.half)
            return (
              <div
                key={card.id}
                onClick={() => tap(idx)}
                style={{
                  height: 'clamp(72px,14vw,108px)',
                  borderRadius: 12,
                  border: '2.5px solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  fontSize: card.type === 'question'
                    ? 'clamp(13px,2.6vw,18px)'
                    : 'clamp(26px,5.5vw,42px)',
                  fontWeight: 800,
                  textAlign: 'center',
                  cursor: isUp ? 'default' : 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                  background: isMatched ? '#dcfce7' : isUp ? '#eef2ff' : '#818cf8',
                  borderColor: isMatched ? '#16a34a' : isUp ? '#4f46e5' : '#6366f1',
                  color: isMatched ? '#15803d' : isUp ? '#4338ca' : 'transparent',
                }}
              >
                {label}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Teaching: splitting into two equal groups ─────────────────────────────────

function Demo({ onDone }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 3 }, () => rnd(1, 5) * 2), [])
  const [ei, setEi] = useState(0)
  const [phase, setPhase] = useState(0) // 0=full group, 1=two halves, 2=answer

  const n = examples[ei]
  const half = n / 2

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
        <div className="mission-subtitle">{t('mission.7B.watchHalf')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px,1.5vw,14px)', alignItems: 'center', width: '100%' }}>

          {/* Full group (phase 0) then two halves (phase 1+) */}
          {phase === 0
            ? <DotRow count={n} color="#f59e0b" />
            : (
              <div style={{ display: 'flex', gap: 'clamp(10px,2vw,18px)', alignItems: 'center' }}>
                <DotRow count={half} color="#f59e0b" />
                <div style={{
                  width: '2px',
                  height: 'clamp(30px,6vw,46px)',
                  background: '#d1d5db',
                  borderRadius: 1,
                  flexShrink: 0,
                }} />
                <DotRow count={half} color="#22c55e" />
              </div>
            )
          }

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
                {t('mission.7B.half')} {n} = {half} ✨
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={next} style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}>
          {ei + 1 < examples.length ? t('mission.next') : t('mission.7B.tryIt')}
        </button>
      </div>
    </div>
  )
}

// ── Test: halve even numbers 2–10 ────────────────────────────────────────────

function genTest() {
  const half = rnd(1, 5)
  const n = half * 2
  const candidates = [...new Set(
    [n, half - 2, half - 1, half + 1, half + 2, half + 3]
      .filter(v => v > 0 && v !== half)
  )]
  while (candidates.length < 3) {
    const v = rnd(1, 9)
    if (v !== half && !candidates.includes(v)) candidates.push(v)
  }
  return { n, half, opts: shuffle([half, ...shuffle(candidates).slice(0, 3)]) }
}

function Quiz({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 6 }, genTest), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { n, half, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === half })
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
        <div className="mission-subtitle">{t('mission.7B.halveIt')}</div>
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
          {t('mission.7B.half')} {n} = ?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, clamp(72px,16vw,120px))', gap: '0.6rem' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === half ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

export default function Mission1_7B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_7B' })
    setStep(3)
  }

  if (step === 0) return <Pelmanism onDone={() => setStep(1)} />
  if (step === 1) return <Demo onDone={() => setStep(2)} />
  if (step === 2) return <Quiz onDone={finish} />
  return <Complete onDone={onComplete} />
}
