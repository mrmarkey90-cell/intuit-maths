import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// a ∈ [11,18], b constrained so diff = a-b ∈ [1,9] (always crosses the tens boundary)
function genQ() {
  const a = rnd(11, 18)
  const bMin = Math.max(1, a - 9)
  const bMax = Math.min(9, a - 1)
  const b = rnd(bMin, bMax)
  return { a, b, diff: a - b }
}

function Progress({ step }) {
  return (
    <div className="mission-progress">
      <div className="mission-progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
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

// Ten-frame visual for a ∈ [11,18].
// Dots are laid out: row1 (0-4), row2 (5-9), extraRow (10+).
// The last `crossed` dots (by index) are red with ×; the rest are green.
// This means extras go red first, then row2 from right — showing the crossing.
function TenFrame({ total, crossed }) {
  const green = total - crossed
  const dot = (i) => (
    <span
      key={i}
      className={`mission-dot mission-dot--lg ${i < green ? 'mission-dot--green' : 'mission-dot--crossed'}`}
    >
      {i >= green && '×'}
    </span>
  )

  const row1 = Array.from({ length: 5 }, (_, i) => dot(i))
  const row2 = Array.from({ length: 5 }, (_, i) => dot(5 + i))
  const extras = Array.from({ length: total - 10 }, (_, i) => dot(10 + i))

  return (
    <div className="mission-tenframe">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px,0.8vw,7px)' }}>
        <div className="mission-tenframe-row">{row1}</div>
        <div className="mission-tenframe-row">{row2}</div>
      </div>
      {extras.length > 0 && (
        <div style={{ marginTop: 'clamp(6px,1.2vw,10px)' }}>
          <div className="mission-tenframe-row">{extras}</div>
        </div>
      )}
    </div>
  )
}

// ── Intro: animated teaching demo ─────────────────────────────────────────────

function Intro({ onDone }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [ei, setEi] = useState(0)
  const [phase, setPhase] = useState(0) // 0=all green, 1=b crossed, 2=answer shown

  const { a, b, diff } = examples[ei]

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 700)
    const t2 = setTimeout(() => setPhase(2), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ei])

  function next() {
    if (ei + 1 >= examples.length) onDone()
    else setEi(e => e + 1)
  }

  const crossed = phase >= 1 ? b : 0

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.watchLabel')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.5rem 1.2rem', fontSize: 'clamp(26px,6.5vw,48px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
          {a} − {b}
        </div>
        <TenFrame total={a} crossed={crossed} />
        <div style={{ minHeight: 'clamp(44px,9vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.4rem' }}>
          {phase >= 2 && (
            <div style={{ fontSize: 'clamp(28px,6.5vw,50px)', fontWeight: 900, color: '#16a34a' }}>
              = {diff}
            </div>
          )}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={next} style={{ visibility: phase >= 2 ? 'visible' : 'hidden' }}>
          {ei + 1 < examples.length ? t('mission.next') : t('mission.4A.letsGo')}
        </button>
      </div>
    </div>
  )
}

// ── S1: Ten-frame shown — how many are left? ──────────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -2, 2, -3, 3])) {
      if (opts.size >= 4) break
      const v = diff + off
      if (v > 0 && v !== diff) opts.add(v)
    }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === diff })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onNext()
      else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.countLeft')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.4rem 1.2rem', fontSize: 'clamp(22px,5.5vw,40px)', fontWeight: 700, textAlign: 'center', margin: '0.2rem 0 0.6rem' }}>
          {a} − {b}
        </div>
        <TenFrame total={a} crossed={b} />
        <div style={{ height: '0.6rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === diff ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S2: Ten-frame + missing subtrahend ────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([b])
    for (const off of shuffle([-2, -1, 1, 2, -3, 3])) {
      if (opts.size >= 4) break
      const v = b + off
      if (v > 0 && v < a && v !== b) opts.add(v)
    }
    while (opts.size < 4) { const v = rnd(1, a - 1); if (!opts.has(v)) opts.add(v) }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === b })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onNext()
      else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.howManyCrossed')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.4rem 1.2rem', fontSize: 'clamp(18px,4.5vw,34px)', fontWeight: 700, textAlign: 'center', margin: '0.2rem 0 0.6rem' }}>
          {a} − <span style={{ color: '#4f46e5', fontSize: 'clamp(22px,5.5vw,40px)' }}>?</span> = {diff}
        </div>
        <TenFrame total={a} crossed={b} />
        <div style={{ height: '0.6rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === b ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S3: No visual — multiple choice ───────────────────────────────────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -2, 2, -3, 3])) {
      if (opts.size >= 4) break
      const v = diff + off
      if (v > 0 && v !== diff) opts.add(v)
    }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === diff })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onNext()
      else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.whatDiff')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.4rem', fontSize: 'clamp(28px,7vw,52px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
          {a} − {b}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === diff ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S4: Numpad ────────────────────────────────────────────────────────────────

function S4({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, genQ), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = parseInt(val, 10) === diff
    setFb(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    else setTimeout(() => setFb(null), 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.6rem', fontSize: 'clamp(28px,7vw,52px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
          {a} − {b}
        </div>
        <RoundDots total={qs.length} current={qi} />
        <NumberPad key={qi} onSubmit={submit} disabled={!!fb} />
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
      <Progress step={4} />
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

export default function Mission2_4A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_4A' })
    setStep(5)
  }

  if (step === 0) return <Intro onDone={() => setStep(1)} />
  if (step === 1) return <S1 onNext={() => setStep(2)} />
  if (step === 2) return <S2 onNext={() => setStep(3)} />
  if (step === 3) return <S3 onNext={() => setStep(4)} />
  if (step === 4) return <S4 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
