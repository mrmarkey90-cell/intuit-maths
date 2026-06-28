import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// a ∈ [21,49] (not ending in 9), b > units-digit-of-a so subtraction always crosses a ten
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

// ── S0: Mini-game — tap two chips that add to a two-digit target ──────────────
// Chips from 5–35; target is a 2-digit number in the twenties/thirties.

function genMiniRound() {
  const target = rnd(20, 50)
  const a = rnd(5, Math.min(35, target - 5))
  const b = target - a
  if (a === b) return genMiniRound()
  const pool = [a, b]
  let tries = 0
  while (pool.length < 4 && tries < 200) {
    const c = rnd(5, 40)
    if (!pool.includes(c) && pool.every(x => x + c !== target)) pool.push(c)
    tries++
  }
  return { target, chips: shuffle(pool) }
}

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genMiniRound), [])
  const [ri, setRi] = useState(0)
  const [sel, setSel] = useState(null)
  const [fb, setFb] = useState(null)
  const { target, chips } = rounds[Math.min(ri, rounds.length - 1)]

  function tap(i) {
    if (fb) return
    if (sel === null) { setSel(i); return }
    if (sel === i) { setSel(null); return }
    const ok = chips[sel] + chips[i] === target
    setFb({ i1: sel, i2: i, ok })
    setTimeout(() => {
      setFb(null); setSel(null)
      if (ok) { if (ri + 1 >= rounds.length) onDone(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4A.tapPairLabel')}</div>
        <div style={{ fontSize: 'clamp(56px,14vw,90px)', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
          {target}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', width: 'min(280px,58vw)' }}>
          {chips.map((n, i) => {
            const inPair = fb && (i === fb.i1 || i === fb.i2)
            const cls = inPair ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : sel === i ? ' mission-bigger-btn--selected' : ''
            return (
              <button key={i} className={`mission-bigger-btn${cls}`} onClick={() => tap(i)} disabled={!!fb}>{n}</button>
            )
          })}
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
    for (const off of shuffle([-1, 1, -2, 2, -10, 10])) {
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
          <div className="mission-title">{t('mission.4A.crossTenTip')}</div>
        ) : (
          <>
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
      <Progress step={2} />
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

// ── S3: Fix the missing digit in the answer ───────────────────────────────────
// Answers are 2-digit here (diff ∈ [12,47]), so one digit position is hidden.

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
            <div className="mission-subtitle">{t('mission.4A.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.2rem', fontSize: 'clamp(20px,5vw,36px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
              {a} − {b} = <span style={{ color: '#4f46e5', fontSize: 'clamp(24px,6vw,44px)' }}>{display}</span>
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

// ── S4: Estimation — the answer is closest to which multiple of 10? ───────────

function genEstRound() {
  const { a, b, diff } = genQ()
  const correct = Math.round(diff / 10) * 10
  const opts = new Set([correct])
  for (const off of shuffle([-10, 10, -20, 20, 30])) {
    if (opts.size >= 4) break
    const v = correct + off
    if (v >= 0) opts.add(v)
  }
  return { a, b, correct, opts: shuffle([...opts]) }
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genEstRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
            <div className="mission-subtitle">{t('mission.4A.estimateLabel')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.4rem', fontSize: 'clamp(24px,6vw,44px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
              {a} − {b}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
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

export default function Mission3_4A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_4A' })
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
