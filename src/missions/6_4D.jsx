import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// a = xx.x (aTenths / 10), b = x.xx (bH / 100)
// All arithmetic done in integer hundredths to avoid float-precision bugs.
function genQ() {
  const aTenths = rnd(100, 999)   // 10.0 to 99.9 — store as tenths
  const aH = aTenths * 10         // same value in hundredths
  const bH = rnd(100, Math.min(999, aH - 1))  // 1.00 to 9.99 in hundredths
  return { aTenths, bH, diffH: aH - bH }
}
function fmt1dp(tenths) { return (tenths / 10).toFixed(1) }
function fmt2dp(h) { return (h / 100).toFixed(2) }

function ColSub({ aTenths, bH }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{fmt1dp(aTenths)}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">−</span>
          <span className="insight-column-number">{fmt2dp(bH)}</span>
        </div>
        <div className="insight-column-rule" />
      </div>
    </div>
  )
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

// ── S0: Mini-game — what must you add to make 1.00? ───────────────────────────
// Show a 2dp decimal; pick its complement to 1.00. Primes hundredths place-value
// thinking, which is the key skill for this level of decimal subtraction.

function genCompRound() {
  const cH = rnd(1, 99)
  const correct = 100 - cH
  const opts = new Set([correct])
  for (const off of shuffle([-5, 5, -10, 10, -3, 3, 8, -8, 15, -15])) {
    if (opts.size >= 4) break
    const v = correct + off
    if (v >= 1 && v <= 99 && v !== correct) opts.add(v)
  }
  return { cH, correct, opts: shuffle([...opts]) }
}

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, genCompRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { cH, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
        <div className="mission-subtitle">{t('mission.4D.complementLabel')}</div>
        <div style={{ fontSize: 'clamp(52px,13vw,84px)', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, textAlign: 'center', margin: '0.3rem 0 0.4rem' }}>
          {fmt2dp(cH)}
        </div>
        <div style={{ fontSize: 'clamp(14px,3.5vw,22px)', color: '#64748b', textAlign: 'center', marginBottom: '0.8rem' }}>
          + ? = 1.00
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', width: 'min(280px,58vw)' }}>
          {[...opts].map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{fmt2dp(opt)}</button>
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
    const { aTenths, bH, diffH } = genQ()
    const correct = fmt2dp(diffH)
    const opts = new Set([correct])
    for (const off of shuffle([-1, 1, -5, 5, -10, 10])) {
      if (opts.size >= 4) break
      const v = diffH + off
      if (v > 0 && fmt2dp(v) !== correct) opts.add(fmt2dp(v))
    }
    return { aTenths, bH, correct, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aTenths, bH, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.4D.complementTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4D.decimalDiff')}</div>
            <ColSub aTenths={aTenths} bH={bH} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
              {[...opts].map(opt => (
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

// ── S2: True or false? ────────────────────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { aTenths, bH, diffH } = genQ()
      return { aTenths, bH, shownH: diffH, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { aTenths, bH, diffH } = genQ()
      const off = shuffle([-1, 1, -5, 5, -10, 10])[0]
      const s = diffH + off
      return { aTenths, bH, shownH: s > 0 ? s : diffH + 1, isTrue: false }
    })
    return shuffle([...trues, ...falses])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aTenths, bH, shownH, isTrue } = rounds[ri]

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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.2rem', fontSize: 'clamp(18px,4.5vw,32px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem', lineHeight: 1.4 }}>
          {fmt1dp(aTenths)} − {fmt2dp(bH)} = {fmt2dp(shownH)}
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

// ── S3: Fix the missing digit (skips decimal point position) ──────────────────

function genFixRound() {
  const { aTenths, bH, diffH } = genQ()
  const str = fmt2dp(diffH)
  const digitPositions = [...str].map((ch, i) => ch !== '.' ? i : null).filter(i => i !== null)
  const pos = digitPositions[rnd(0, digitPositions.length - 1)]
  const correct = parseInt(str[pos], 10)
  const opts = new Set([correct])
  while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
  const display = str.slice(0, pos) + '?' + str.slice(pos + 1)
  return { aTenths, bH, display, correct, opts: shuffle([...opts]) }
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genFixRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aTenths, bH, display, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
            <div className="mission-subtitle">{t('mission.4D.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1rem', fontSize: 'clamp(16px,4vw,28px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem', lineHeight: 1.4 }}>
              {fmt1dp(aTenths)} − {fmt2dp(bH)} = <span style={{ color: '#4f46e5', fontSize: 'clamp(20px,5vw,34px)' }}>{display}</span>
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

// ── S4: Which has the bigger answer? ─────────────────────────────────────────

function genCompRound() {
  let q1, q2
  do { q1 = genQ(); q2 = genQ() } while (Math.abs(q1.diffH - q2.diffH) < 50)
  return { q1, q2, biggerIdx: q1.diffH > q2.diffH ? 0 : 1 }
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genCompRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { q1, q2, biggerIdx } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(idx) {
    if (fb || done) return
    const ok = idx === biggerIdx
    setFb({ idx, ok })
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
            <div className="mission-subtitle">{t('mission.4D.whichBigger')}</div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', margin: '0.5rem 0 1rem' }}>
              {[q1, q2].map(({ aTenths, bH }, idx) => {
                const isSel = fb && fb.idx === idx
                const cls = isSel ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : ''
                return (
                  <button key={idx} className={`mission-bigger-btn${cls}`}
                    style={{ flex: 1, maxWidth: 'clamp(120px,28vw,170px)', fontSize: 'clamp(13px,2.8vw,19px)', lineHeight: 1.6 }}
                    onClick={() => pick(idx)} disabled={!!fb}>
                    {fmt1dp(aTenths)} − {fmt2dp(bH)}
                  </button>
                )
              })}
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

// ── S5: NumPad (decimal, 2dp) ─────────────────────────────────────────────────

function S5({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, genQ), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aTenths, bH, diffH } = qs[qi]
  const expected = fmt2dp(diffH)

  function submit(val) {
    if (fb) return
    const ok = parseFloat(val).toFixed(2) === expected
    setFb(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    else setTimeout(() => setFb(null), 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <ColSub aTenths={aTenths} bH={bH} />
        <RoundDots total={qs.length} current={qi} />
        <NumberPad key={qi} onSubmit={submit} allowDecimal={true} disabled={!!fb} />
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

export default function Mission6_4D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_4D' })
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
