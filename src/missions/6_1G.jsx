import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function factorsOf(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }

function commonFactors(a, b) {
  return factorsOf(a).filter(v => v > 1 && b % v === 0)
}

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

// ── Screen 1: Find all factors of N (warm-up, 6-tile) ────────────────────────

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

function S1FactorWarmup({ onNext }) {
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(() => genFactorQ(8, 15))
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { onNext(); return }
    if (correct) setCount(c => c + 1)
    setQ(genFactorQ(8, 15))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <FactorMultiQ key={roundKey} q={q} onComplete={advance} />
        <RoundDots total={TOTAL} current={count} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
    </div>
  )
}

// ── Screen 2: Teach — side-by-side factor lists, common highlighted ───────────

function genTeachPair() {
  let a, b, common
  do {
    const shared = rnd(2, 6)
    a = shared * rnd(2, 4)
    b = shared * rnd(2, 4)
    common = commonFactors(a, b)
  } while (a === b || a > 30 || b > 30 || common.length === 0)
  return { a, b, common: new Set(common) }
}

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const { a, b, common } = useMemo(genTeachPair, [])
  const factA = useMemo(() => factorsOf(a), [a])
  const factB = useMemo(() => factorsOf(b), [b])
  const [phase, setPhase] = useState(0)

  function advance() {
    if (phase < 3) setPhase(p => p + 1)
    else onNext()
  }

  function chipCls(v, isCommon) {
    if (phase < 3) return 'mission-multiples-chip' + (phase >= 2 ? ' mission-multiples-chip--lit' : '')
    return isCommon
      ? 'mission-multiples-chip mission-multiples-chip--lit'
      : 'mission-multiples-chip'
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {phase === 0 && t('mission.6_1G.commonOf') + a + t('mission.6_1G.and') + b}
          {phase === 1 && `${t('mission.1G.factorsOf')}${a}:`}
          {phase === 2 && `${t('mission.1G.factorsOf')}${b}:`}
          {phase === 3 && t('mission.6_1G.appear')}
        </div>

        {phase >= 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vw, 14px)', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', fontWeight: 700, color: '#4f46e5', minWidth: '3em' }}>{a}:</span>
              {factA.map(v => (
                <span key={v} className={chipCls(v, common.has(v))} style={{ fontSize: 'clamp(13px, 2.2vw, 18px)' }}>{v}</span>
              ))}
            </div>
            {phase >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', fontWeight: 700, color: '#4f46e5', minWidth: '3em' }}>{b}:</span>
                {factB.map(v => (
                  <span key={v} className={chipCls(v, common.has(v))} style={{ fontSize: 'clamp(13px, 2.2vw, 18px)' }}>{v}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 3 && (
          <div style={{ display: 'flex', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'clamp(4px, 0.8vw, 8px)' }}>
            {[...common].sort((x, y) => x - y).map(v => (
              <span key={v} className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>{v}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={advance}>
          {phase < 3 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screens 3–4: Circle — which divides both? ─────────────────────────────────

function genCircleQ(maxN) {
  let a, b, cf
  do {
    const shared = rnd(2, 8)
    a = shared * rnd(2, 5)
    b = shared * rnd(2, 5)
    cf = commonFactors(a, b)
  } while (a === b || a > maxN || b > maxN || cf.length === 0)
  const correct = pick(cf)
  const wrong = shuffle([
    ...factorsOf(a).filter(v => v > 1 && b % v !== 0),
    ...factorsOf(b).filter(v => v > 1 && a % v !== 0),
  ]).slice(0, 3)
  const options = shuffle([correct, ...wrong]).slice(0, 4)
  return { a, b, correct, options }
}

function CircleRound({ a, b, correct, options, onComplete }) {
  const { t } = useTranslation()
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div style={{ display: 'flex', gap: 'clamp(10px, 2vw, 18px)', alignItems: 'center' }}>
        <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{a}</span>
        <span style={{ color: '#6b7280', fontSize: 'clamp(14px, 2.5vw, 20px)' }}>&</span>
        <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{b}</span>
      </div>
      <div className="mission-spot-grid">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function CircleScreen({ step, maxN, total, onDone }) {
  const { t } = useTranslation()
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(() => genCircleQ(maxN))
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= total) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genCircleQ(maxN))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.6_1G.great') : t('mission.6_1G.whichCommon')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <CircleRound key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={total} current={count} />
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

// ── Screen 5: Numpad — write a common factor ──────────────────────────────────

function genNumpadQ() {
  let a, b, cf
  do {
    const shared = rnd(2, 10)
    a = shared * rnd(2, 5)
    b = shared * rnd(2, 5)
    cf = commonFactors(a, b)
  } while (a === b || a > 50 || b > 50 || cf.length === 0)
  return { a, b, cf }
}

function NumpadQ({ q, onComplete }) {
  const [wrongVal, setWrongVal] = useState(null)
  const [correct, setCorrect] = useState(false)
  const [padKey, setPadKey] = useState(0)

  function submit(input) {
    if (correct || wrongVal !== null) return
    const v = parseInt(input, 10)
    if (q.cf.includes(v)) {
      setCorrect(true)
      setTimeout(onComplete, 800)
    } else {
      setWrongVal(input)
      setTimeout(() => { setWrongVal(null); setPadKey(k => k + 1) }, 700)
    }
  }

  function boxCls() {
    if (correct) return 'mission-gap-box mission-gap-box--wide mission-gap-box--correct'
    if (wrongVal !== null) return 'mission-gap-box mission-gap-box--wide mission-gap-box--wrong'
    return 'mission-gap-box mission-gap-box--wide mission-gap-box--active'
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 14px)', alignItems: 'center', justifyContent: 'center' }}>
        <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{q.a}</span>
        <span style={{ color: '#6b7280', fontSize: 'clamp(14px, 2.5vw, 20px)' }}>&</span>
        <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{q.b}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className={boxCls()}>{correct ? '✓' : wrongVal !== null ? wrongVal : '?'}</div>
      </div>
      <NumberPad key={padKey} onSubmit={submit} stage={1} disabled={correct || wrongVal !== null} />
    </>
  )
}

function S5Numpad({ onFinish }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genNumpadQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onFinish(); else setIdx(i => i + 1) }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1G.writeCommon')}</div>
        <NumpadQ key={idx} q={q} onComplete={advance} />
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
        <div className="mission-complete-icon">🔗</div>
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

export default function Mission6_1G({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_1G' })
    setStep(5)
  }

  if (step === 0) return <S1FactorWarmup onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <CircleScreen step={3} maxN={36} total={3} onDone={() => setStep(3)} />
  if (step === 3) return <CircleScreen step={4} maxN={50} total={3} onDone={() => setStep(4)} />
  if (step === 4) return <S5Numpad onFinish={finish} />
  return <Complete onDone={onComplete} />
}
