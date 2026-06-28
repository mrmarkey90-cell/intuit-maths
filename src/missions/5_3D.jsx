import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Work in integer tenths to avoid float-precision bugs throughout
function genQ() {
  const aT10 = rnd(10, 89), bT10 = rnd(10, 89)
  return { aT10, bT10, sumT10: aT10 + bT10 }
}
function fmt1(t10) { return (t10 / 10).toFixed(1) }

function ColSum({ aT10, bT10 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{fmt1(aT10)}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">+</span>
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
// Three rounds; a pool of 4 chips where exactly one pair sums to the target.

function genMiniRound() {
  const targetT10 = rnd(30, 140)
  const aT10 = rnd(Math.max(10, targetT10 - 89), Math.min(89, targetT10 - 10))
  const bT10 = targetT10 - aT10
  const pool = [aT10, bT10]
  let tries = 0
  while (pool.length < 4 && tries < 200) {
    const cT10 = rnd(10, 89)
    if (!pool.includes(cT10) && pool.every(x => x + cT10 !== targetT10)) pool.push(cT10)
    tries++
  }
  return { target: fmt1(targetT10), chips: shuffle(pool).map(fmt1) }
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
    const sumT10 = Math.round(parseFloat(chips[sel]) * 10) + Math.round(parseFloat(chips[i]) * 10)
    const ok = sumT10 === Math.round(parseFloat(target) * 10)
    setFb({ i1: sel, i2: i, ok })
    setTimeout(() => {
      setFb(null); setSel(null)
      if (ok) { if (ri + 1 >= rounds.length) onDone(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3D.tapPair')}</div>
        <div style={{ fontSize: 'clamp(60px,15vw,96px)', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, textAlign: 'center', margin: '0.3rem 0 1rem' }}>
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

// ── S1: What do the tenths add to? ────────────────────────────────────────────
// Shows a column sum; asks for the raw tenths-column total (can be ≥ 10).

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { aT10, bT10 } = genQ()
    const correct = (aT10 % 10) + (bT10 % 10)
    const opts = new Set([correct])
    while (opts.size < 4) { const d = correct + rnd(-4, 4); if (d >= 0 && d !== correct) opts.add(d) }
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
          <div className="mission-title">{t('mission.3D.tenthsTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3D.tenthsTotal')}</div>
            <ColSum aT10={aT10} bT10={bT10} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(opt)}
                  disabled={!!fb}
                >{opt}</button>
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

// ── S2: True or false — is this decimal sum correct? ─────────────────────────
// Wrong answers are off by ±0.1 or ±1.0 — typical decimal carry mistakes.

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { aT10, bT10, sumT10 } = genQ()
      return { aT10, bT10, shownT10: sumT10, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { aT10, bT10, sumT10 } = genQ()
      const off = shuffle([-1, 1, -10, 10, -11, 11])[0]
      return { aT10, bT10, shownT10: sumT10 + off, isTrue: false }
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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(22px,5vw,38px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {fmt1(aT10)} + {fmt1(bT10)} = {fmt1(shownT10)}
        </div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button
              key={String(v)}
              className={`mission-bigger-btn${fb ? v === isTrue ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(16px,3.5vw,26px)', width: 'clamp(90px,18vw,140px)' }}
              onClick={() => pick(v)}
              disabled={!!fb}
            >{v ? t('mission.2B.trueBtn') : t('mission.2B.falseBtn')}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S3: Reverse lookup — given the answer, which expression produces it? ──────
// Reinforces the skill from both directions: recognise the sum that fits.

function genRevRound() {
  const targetT10 = rnd(30, 140)
  const minA = Math.max(10, targetT10 - 89), maxA = Math.min(89, targetT10 - 10)
  const aT10 = rnd(minA, maxA)
  const bT10 = targetT10 - aT10

  const wrongs = []
  for (const off of shuffle([-1, 1, -2, 2, -5, 5, -10, 10])) {
    if (wrongs.length >= 3) break
    const wt = targetT10 + off
    const wMin = Math.max(10, wt - 89), wMax = Math.min(89, wt - 10)
    if (wt < 20 || wMax < wMin) continue
    const wa = rnd(wMin, wMax)
    wrongs.push({ aT10: wa, bT10: wt - wa })
  }

  return {
    target: fmt1(targetT10),
    options: shuffle([
      { expr: `${fmt1(aT10)} + ${fmt1(bT10)}`, isCorrect: true },
      ...wrongs.slice(0, 3).map(w => ({ expr: `${fmt1(w.aT10)} + ${fmt1(w.bT10)}`, isCorrect: false }))
    ])
  }
}

function S3({ onNext }) {
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
      <Progress step={3} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3D.alignTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3D.reverseLabel')}</div>
            <div style={{ fontSize: 'clamp(56px,14vw,88px)', fontWeight: 900, color: '#0ea5e9', textAlign: 'center', margin: '0.2rem 0 0.8rem' }}>
              {target}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
              {options.map(opt => {
                const isFb = fb && fb.expr === opt.expr
                const cls = isFb ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : ''
                return (
                  <button
                    key={opt.expr}
                    className={`mission-bigger-btn${cls}`}
                    style={{ fontSize: 'clamp(14px,3vw,20px)' }}
                    onClick={() => pick(opt)}
                    disabled={!!fb}
                  >{opt.expr}</button>
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

// ── S4: Fix the digit — one digit in the answer is hidden ─────────────────────
// Skips the decimal point when choosing which digit to hide.

function genFixRound() {
  const { aT10, bT10, sumT10 } = genQ()
  const sumStr = fmt1(sumT10)
  const digitPositions = [...sumStr].map((ch, i) => (ch !== '.' ? i : null)).filter(i => i !== null)
  const pos = digitPositions[rnd(0, digitPositions.length - 1)]
  const correct = parseInt(sumStr[pos], 10)
  const opts = new Set([correct])
  while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
  const display = sumStr.slice(0, pos) + '?' + sumStr.slice(pos + 1)
  return { aT10, bT10, display, correct, opts: shuffle([...opts]) }
}

function S4({ onNext }) {
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
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">✓</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3D.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.2rem', fontSize: 'clamp(20px,4.5vw,34px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0' }}>
              {fmt1(aT10)} + {fmt1(bT10)} = <span style={{ color: '#4f46e5', fontSize: 'clamp(24px,5.5vw,40px)' }}>{display}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)', marginTop: '0.6rem' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(opt)}
                  disabled={!!fb}
                >{opt}</button>
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

// ── S5: NumPad final test ─────────────────────────────────────────────────────

function S5({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, genQ), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aT10, bT10, sumT10 } = qs[qi]
  const expected = fmt1(sumT10)

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
        <ColSum aT10={aT10} bT10={bT10} />
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

export default function Mission5_3D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_3D' })
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
