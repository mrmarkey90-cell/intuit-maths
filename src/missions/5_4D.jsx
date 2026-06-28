import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Work in integer tenths to avoid float-precision bugs throughout.
function genQ() {
  const aT10 = rnd(20, 99)
  const bT10 = rnd(10, aT10 - 1)
  return { aT10, bT10, diffT10: aT10 - bT10 }
}
function fmt1(t10) { return (t10 / 10).toFixed(1) }

function ColSub({ aT10, bT10 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{fmt1(aT10)}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">−</span>
          <span className="insight-column-number">{fmt1(bT10)}</span>
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

// ── S0: Mini-game — tap two decimals that add to the target ───────────────────
// 1dp chips; exactly one pair sums to the target.

function genMiniRound() {
  const targetT10 = rnd(20, 150)
  const aT10 = rnd(Math.max(10, targetT10 - 89), Math.min(89, targetT10 - 10))
  const bT10 = targetT10 - aT10
  const pool = [aT10, bT10]
  let tries = 0
  while (pool.length < 4 && tries < 200) {
    const cT10 = rnd(10, 89)
    if (!pool.includes(cT10) && pool.every(x => x + cT10 !== targetT10)) pool.push(cT10)
    tries++
  }
  return { targetT10, chips: shuffle(pool) }
}

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genMiniRound), [])
  const [ri, setRi] = useState(0)
  const [sel, setSel] = useState(null)
  const [fb, setFb] = useState(null)
  const { targetT10, chips } = rounds[Math.min(ri, rounds.length - 1)]

  function tap(i) {
    if (fb) return
    if (sel === null) { setSel(i); return }
    if (sel === i) { setSel(null); return }
    const ok = chips[sel] + chips[i] === targetT10
    setFb({ i1: sel, i2: i, ok })
    setTimeout(() => {
      setFb(null); setSel(null)
      if (ok) { if (ri + 1 >= rounds.length) onDone(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4D.tapPairLabel')}</div>
        <div style={{ fontSize: 'clamp(56px,14vw,90px)', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
          {fmt1(targetT10)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', width: 'min(280px,58vw)' }}>
          {chips.map((n, i) => {
            const inPair = fb && (i === fb.i1 || i === fb.i2)
            const cls = inPair ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : sel === i ? ' mission-bigger-btn--selected' : ''
            return (
              <button key={i} className={`mission-bigger-btn${cls}`} onClick={() => tap(i)} disabled={!!fb}>{fmt1(n)}</button>
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
    const { aT10, bT10, diffT10 } = genQ()
    const correct = fmt1(diffT10)
    const opts = new Set([correct])
    for (const off of shuffle([-1, 1, -2, 2, -10, 10])) {
      if (opts.size >= 4) break
      const v = diffT10 + off
      if (v > 0 && fmt1(v) !== correct) opts.add(fmt1(v))
    }
    return { aT10, bT10, correct, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aT10, bT10, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
          <div className="mission-title">{t('mission.4D.decimalTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4D.decimalDiff')}</div>
            <ColSub aT10={aT10} bT10={bT10} />
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
      const { aT10, bT10, diffT10 } = genQ()
      return { aT10, bT10, shownT10: diffT10, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { aT10, bT10, diffT10 } = genQ()
      const off = shuffle([-1, 1, -10, 10])[0]
      const s = diffT10 + off
      return { aT10, bT10, shownT10: s > 0 ? s : diffT10 + 1, isTrue: false }
    })
    return shuffle([...trues, ...falses])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aT10, bT10, shownT10, isTrue } = rounds[ri]

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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(20px,5vw,36px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {fmt1(aT10)} − {fmt1(bT10)} = {fmt1(shownT10)}
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

// ── S3: Fix the missing digit (skips the decimal point position) ──────────────

function genFixRound() {
  const { aT10, bT10, diffT10 } = genQ()
  const str = fmt1(diffT10)
  const digitPositions = [...str].map((ch, i) => ch !== '.' ? i : null).filter(i => i !== null)
  const pos = digitPositions[rnd(0, digitPositions.length - 1)]
  const correct = parseInt(str[pos], 10)
  const opts = new Set([correct])
  while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
  const display = str.slice(0, pos) + '?' + str.slice(pos + 1)
  return { aT10, bT10, display, correct, opts: shuffle([...opts]) }
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genFixRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aT10, bT10, display, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.2rem', fontSize: 'clamp(20px,5vw,34px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
              {fmt1(aT10)} − {fmt1(bT10)} = <span style={{ color: '#4f46e5', fontSize: 'clamp(24px,6vw,40px)' }}>{display}</span>
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

// ── S4: Reverse lookup — given the answer, which expression produces it? ──────

function genRevRound() {
  const diffT10 = rnd(5, 70)
  const bT10 = rnd(10, Math.min(89, 99 - diffT10))
  const aT10 = bT10 + diffT10
  const wrongs = []
  for (const off of shuffle([-1, 1, -2, 2, -5, 5, -10, 10])) {
    if (wrongs.length >= 3) break
    const wt = diffT10 + off
    if (wt <= 0 || 99 - wt < 10) continue
    const wb = rnd(10, Math.min(89, 99 - wt))
    wrongs.push({ aT10: wb + wt, bT10: wb })
  }
  return {
    target: fmt1(diffT10),
    options: shuffle([
      { expr: `${fmt1(aT10)} − ${fmt1(bT10)}`, isCorrect: true },
      ...wrongs.slice(0, 3).map(w => ({ expr: `${fmt1(w.aT10)} − ${fmt1(w.bT10)}`, isCorrect: false }))
    ])
  }
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genRevRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { target, options } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ expr: opt.expr, ok: opt.isCorrect })
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
            <div className="mission-subtitle">{t('mission.4D.reverseLabel')}</div>
            <div style={{ fontSize: 'clamp(52px,13vw,84px)', fontWeight: 900, color: '#0ea5e9', textAlign: 'center', margin: '0.2rem 0 0.8rem' }}>
              {target}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
              {options.map(opt => {
                const isFb = fb && fb.expr === opt.expr
                const cls = isFb ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : ''
                return (
                  <button key={opt.expr}
                    className={`mission-bigger-btn${cls}`}
                    style={{ fontSize: 'clamp(14px,3vw,20px)' }}
                    onClick={() => pick(opt)} disabled={!!fb}>{opt.expr}</button>
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

// ── S5: NumPad (decimal) ──────────────────────────────────────────────────────

function S5({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, genQ), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aT10, bT10, diffT10 } = qs[qi]
  const expected = fmt1(diffT10)

  function submit(val) {
    if (fb) return
    const ok = parseFloat(val).toFixed(1) === expected
    setFb(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    else setTimeout(() => setFb(null), 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <ColSub aT10={aT10} bT10={bT10} />
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

export default function Mission5_4D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_4D' })
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
