import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// a ∈ [21,49] (not ending in 0 or 9), b > units digit so answer always crosses a tens boundary
function genQ() {
  let a
  do { a = rnd(21, 49) } while (a % 10 === 9 || a % 10 === 0)
  const bMin = (a % 10) + 1
  const b = rnd(bMin, 9)
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

// A numbered track from diff to a showing the hop.
// phase 0: all neutral; phase 1: a=blue, rest neutral; phase 2: a=blue, passed=amber, diff=green
function NumTrack({ a, diff, phase }) {
  const nums = []
  for (let n = diff; n <= a; n++) nums.push(n)

  return (
    <div className="mission-numtrack">
      {nums.map(n => {
        let cls = 'mission-numtrack-box'
        if (phase >= 2) {
          if (n === a) cls += ' mission-numtrack-box--start'
          else if (n === diff) cls += ' mission-numtrack-box--end'
          else cls += ' mission-numtrack-box--passed'
        } else if (phase === 1 && n === a) {
          cls += ' mission-numtrack-box--start'
        }
        // Tens boundary gets an extra outline (applied on top of other classes)
        if (n % 10 === 0 && n !== a && n !== diff) cls += ' mission-numtrack-box--ten'
        return <div key={n} className={cls}>{n}</div>
      })}
    </div>
  )
}

// ── Intro: animated teaching demo ─────────────────────────────────────────────

function Intro({ onDone }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 3 }, genQ), [])
  const [ei, setEi] = useState(0)
  const [phase, setPhase] = useState(0) // 0=neutral, 1=start lit, 2=full hop, 3=answer label

  const { a, b, diff } = examples[ei]

  useEffect(() => {
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 1100)
    const t3 = setTimeout(() => setPhase(3), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [ei])

  function next() {
    if (ei + 1 >= examples.length) onDone()
    else setEi(e => e + 1)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.watchLabel')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.5rem 1.2rem', fontSize: 'clamp(26px,6.5vw,48px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
          {a} − {b}
        </div>
        <NumTrack a={a} diff={diff} phase={phase} />
        <div style={{ minHeight: 'clamp(44px,9vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem' }}>
          {phase >= 3 && (
            <div style={{ fontSize: 'clamp(28px,6.5vw,50px)', fontWeight: 900, color: '#16a34a' }}>
              = {diff}
            </div>
          )}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={next} style={{ visibility: phase >= 3 ? 'visible' : 'hidden' }}>
          {ei + 1 < examples.length ? t('mission.next') : t('mission.4A.letsGo')}
        </button>
      </div>
    </div>
  )
}

// ── S1: Number track shown — multiple choice ──────────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -2, 2, -10, 10])) {
      if (opts.size >= 4) break
      const v = diff + off
      if (v > 0 && v !== diff) opts.add(v)
    }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  // Show the full hop once answered correctly
  const trackPhase = fb?.ok ? 2 : 1

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === diff })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onNext()
      else setRi(r => r + 1)
    }, 900)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.trackLabel')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.4rem 1.2rem', fontSize: 'clamp(22px,5.5vw,40px)', fontWeight: 700, textAlign: 'center', margin: '0.2rem 0 0.6rem' }}>
          {a} − {b}
        </div>
        <NumTrack a={a} diff={diff} phase={trackPhase} />
        <div style={{ height: '0.6rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
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

// ── S2: No visual — multiple choice ───────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -2, 2, -10, 10])) {
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
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.whatDiff')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.4rem', fontSize: 'clamp(28px,7vw,52px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
          {a} − {b}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
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

// ── S3: True or false? ────────────────────────────────────────────────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      return { a, b, shown: diff, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      const off = shuffle([-1, 1, -2, 2, -10, 10])[0]
      const s = diff + off
      return { a, b, shown: s > 0 ? s : diff + 1, isTrue: false }
    })
    return shuffle([...trues, ...falses])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, shown, isTrue } = rounds[ri]

  function pick(v) {
    if (fb) return
    const ok = v === isTrue
    setFb({ v, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) onNext(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(22px,5.5vw,40px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {a} − {b} = {shown}
        </div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button key={String(v)}
              className={`mission-bigger-btn${fb ? v === isTrue ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(16px,3.5vw,26px)', width: 'clamp(90px,18vw,140px)' }}
              onClick={() => pick(v)} disabled={!!fb}>
              {v ? t('mission.2B.trueBtn') : t('mission.2B.falseBtn')}
            </button>
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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.4rem', fontSize: 'clamp(28px,7vw,52px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
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

export default function Mission3_4A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_4A' })
    setStep(5)
  }

  if (step === 0) return <Intro onDone={() => setStep(1)} />
  if (step === 1) return <S1 onNext={() => setStep(2)} />
  if (step === 2) return <S2 onNext={() => setStep(3)} />
  if (step === 3) return <S3 onNext={() => setStep(4)} />
  if (step === 4) return <S4 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
