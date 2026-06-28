import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function fmt(n) { return n.toLocaleString('en-GB') }

function genQ() {
  const a = rnd(10000, 99999)
  const b = rnd(1000, 9999)
  return { a, b, diff: a - b }
}

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

function ColSub({ a, b }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{fmt(a)}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">−</span>
          <span className="insight-column-number">{fmt(b)}</span>
        </div>
        <div className="insight-column-rule" />
      </div>
    </div>
  )
}

// ── S0: Mini-game — estimate the difference to the nearest 10,000 ─────────────
// An estimation warm-up that builds number sense for large subtraction.

function genEstRound() {
  const a = rnd(20000, 90000)
  const b = rnd(1000, Math.min(9999, a - 5000))
  const diff = a - b
  const correct = Math.round(diff / 10000) * 10000
  const opts = new Set([correct])
  for (const off of shuffle([-10000, 10000, -20000, 20000, 30000, -30000])) {
    if (opts.size >= 4) break
    const v = correct + off
    if (v >= 0) opts.add(v)
  }
  return { a, b, correct, opts: shuffle([...opts]) }
}

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, genEstRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    const ok = opt === correct
    setFb({ opt, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) onDone(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4C.estimateLabel')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.5rem 1.2rem', fontSize: 'clamp(18px,4.5vw,32px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {fmt(a)} − {fmt(b)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(13px,2.8vw,19px)' }}
              onClick={() => pick(opt)} disabled={!!fb}>{fmt(opt)}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
    </div>
  )
}

// ── S1: What is the answer? ───────────────────────────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -10, 10, -100, 100, -1000, 1000])) {
      if (opts.size >= 4) break
      const v = diff + off
      if (v > 0 && v !== diff) opts.add(v)
    }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === diff })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.4C.borrowTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4C.pickAnswer')}</div>
            <ColSub a={a} b={b} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(320px,66vw)' }}>
              {opts.map(opt => (
                <button key={opt}
                  className={`mission-bigger-btn${fb ? opt === diff ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(12px,2.6vw,17px)' }}
                  onClick={() => pick(opt)} disabled={!!fb}>{fmt(opt)}</button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={ri} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>{t('mission.next')}</button>
      </div>
    </div>
  )
}

// ── S2: True or false? ────────────────────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      return { a, b, shown: diff, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      const off = shuffle([-1, 1, -10, 10, -100, 100])[0]
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
      <Progress step={2} />
      <div className="mission-body">
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.2rem', fontSize: 'clamp(16px,4vw,28px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {fmt(a)} − {fmt(b)} = {fmt(shown)}
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

// ── S3: Fix the missing digit in the answer ───────────────────────────────────

function genFixRound() {
  const { a, b, diff } = genQ()
  const str = String(diff)
  const pos = rnd(0, str.length - 1)
  const correct = parseInt(str[pos], 10)
  const opts = new Set([correct])
  while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
  const display = str.slice(0, pos) + '?' + str.slice(pos + 1)
  return { a, b, display, correct, opts: shuffle([...opts]) }
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genFixRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, display, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === correct })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">✓</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4C.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.5rem 1rem', fontSize: 'clamp(14px,3.5vw,24px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem', lineHeight: 1.4 }}>
              {fmt(a)} − {fmt(b)} ={' '}
              <span style={{ color: '#4f46e5', fontSize: 'clamp(18px,4.5vw,30px)' }}>{display}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)', marginTop: '0.4rem' }}>
              {opts.map(opt => (
                <button key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={ri} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>{t('mission.next')}</button>
      </div>
    </div>
  )
}

// ── S4: What was the starting number? (missing minuend) ───────────────────────
// Shows "? − b = diff", pick which of 4 options is the missing minuend.

function genMissMinRound() {
  const { a, b, diff } = genQ()
  const opts = new Set([a])
  for (const off of shuffle([-1000, 1000, -100, 100, -10000, 10000, -5000, 5000])) {
    if (opts.size >= 4) break
    const v = a + off
    if (v > 0 && v !== a) opts.add(v)
  }
  return { b, diff, correct: a, opts: shuffle([...opts]) }
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genMissMinRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { b, diff, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === correct })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">✓</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4C.missingMinuend')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.1rem', fontSize: 'clamp(14px,3.5vw,24px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 1rem', lineHeight: 1.5 }}>
              <span style={{ color: '#4f46e5', fontSize: 'clamp(18px,4.5vw,32px)' }}>?</span> − {fmt(b)} = {fmt(diff)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(320px,66vw)' }}>
              {opts.map(opt => (
                <button key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(12px,2.6vw,17px)' }}
                  onClick={() => pick(opt)} disabled={!!fb}>{fmt(opt)}</button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={ri} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>{t('mission.next')}</button>
      </div>
    </div>
  )
}

// ── S5: NumPad ────────────────────────────────────────────────────────────────

function S5({ onFinish }) {
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
      <Progress step={5} />
      <div className="mission-body">
        <ColSub a={a} b={b} />
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
      <Progress step={5} />
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

export default function Mission6_4C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_4C' })
    setStep(6)
  }

  if (step === 0) return <MiniGame onDone={() => setStep(1)} />
  if (step === 1) return <S1 onNext={() => setStep(2)} />
  if (step === 2) return <S2 onNext={() => setStep(3)} />
  if (step === 3) return <S3 onNext={() => setStep(4)} />
  if (step === 4) return <S4 onNext={() => setStep(5)} />
  if (step === 5) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
