import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Work in integer hundredths; a = xx.xx (1000–9999), b = x.xx (100–999)
function genQ() {
  const aH = rnd(1000, 9999), bH = rnd(100, 999)
  return { aH, bH, sumH: aH + bH }
}
function fmt2(h) { return (h / 100).toFixed(2) }

function ColSum({ aH, bH }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{fmt2(aH)}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">+</span>
          <span className="insight-column-number">{fmt2(bH)}</span>
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

// ── S0: Mini-game — hundredths carry radar ────────────────────────────────────
// Show two hundredths values (1–99); does their sum reach 100? Carry or not?
// Warms up the key intuition before column addition with hundredths.

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const carries = [], noCarries = []
    while (carries.length < 3) { const a = rnd(1, 99), b = rnd(1, 99); if (a + b >= 100) carries.push({ a, b, carries: true }) }
    while (noCarries.length < 2) { const a = rnd(1, 99), b = rnd(1, 99); if (a + b < 100) noCarries.push({ a, b, carries: false }) }
    return shuffle([...carries, ...noCarries])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, carries: doesCarry } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(chosen) {
    if (fb || done) return
    const ok = chosen === doesCarry
    setFb({ chosen, ok })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3D.hundredthsCarryTitle')}</div>
        {done ? (
          <div className="mission-title">{t('mission.3D.hundredthsTip')}</div>
        ) : (
          <>
            <div style={{ background: '#f0f9ff', borderRadius: 14, padding: '1rem 1.6rem', fontSize: 'clamp(44px,10vw,72px)', fontWeight: 900, textAlign: 'center', color: '#0369a1', margin: '0.4rem 0 0.8rem' }}>
              {a} + {b}
            </div>
            <div className="mission-bigger-row">
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  className={`mission-bigger-btn${fb ? v === doesCarry ? ' mission-bigger-btn--correct' : v === fb.chosen && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,3vw,22px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{v ? t('mission.3D.yesCarry') : t('mission.3D.noCarry')}</button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={ri} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onDone} style={{ visibility: done ? 'visible' : 'hidden' }}>{t('mission.next')}</button>
      </div>
    </div>
  )
}

// ── S1: What do the hundredths add to? ───────────────────────────────────────
// Shows the column sum; the raw hundredths total (both last two digits) can ≥ 100.

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { aH, bH } = genQ()
    const correct = (aH % 100) + (bH % 100)
    const opts = new Set([correct])
    while (opts.size < 4) { const d = correct + rnd(-5, 5) * 7; if (d >= 0 && d !== correct) opts.add(d) }
    return { aH, bH, correct, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aH, bH, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
          <div className="mission-title">{t('mission.3D.hundredthsTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3D.hundredthsTotal')}</div>
            <ColSum aH={aH} bH={bH} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,3vw,20px)' }}
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

// ── S2: Which sum is bigger? — two column sums side by side ──────────────────
// Pupils must compute both to compare; the two answers differ by at least 1.00.

function genComparePair() {
  let q1 = genQ(), q2 = genQ()
  while (Math.abs(q1.sumH - q2.sumH) < 100) q2 = genQ()
  return [q1, q2]
}

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genComparePair), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [q1, q2] = rounds[Math.min(ri, rounds.length - 1)]
  const biggerIdx = q1.sumH > q2.sumH ? 0 : 1

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
      <Progress step={2} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">✓</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3D.whichBigger')}</div>
            <div style={{ display: 'flex', gap: '0.8rem', width: '100%', justifyContent: 'center', margin: '0.5rem 0 1rem' }}>
              {[q1, q2].map(({ aH, bH }, idx) => {
                const isSelected = fb && fb.idx === idx
                const cls = isSelected ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : ''
                return (
                  <button
                    key={idx}
                    className={`mission-bigger-btn${cls}`}
                    style={{ flex: 1, maxWidth: 'clamp(110px,28vw,160px)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.6rem 0.4rem', gap: 0 }}
                    onClick={() => pick(idx)}
                    disabled={!!fb}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 'clamp(14px,3vw,20px)', fontWeight: 700, whiteSpace: 'pre' }}>
                      {`  ${fmt2(aH)}\n+ ${fmt2(bH)}\n${'─'.repeat(7)}`}
                    </span>
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

// ── S3: True or false — is this 2dp sum correct? ─────────────────────────────
// Wrong answers vary a digit in the hundredths, tenths, or ones column.

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { aH, bH, sumH } = genQ()
      return { aH, bH, shownH: sumH, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { aH, bH, sumH } = genQ()
      const off = shuffle([-1, 1, -10, 10, -100, 100])[0]
      return { aH, bH, shownH: sumH + off, isTrue: false }
    })
    return shuffle([...trues, ...falses])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { aH, bH, shownH, isTrue } = rounds[ri]

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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.2rem', fontSize: 'clamp(18px,4vw,30px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {fmt2(aH)} + {fmt2(bH)} = {fmt2(shownH)}
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

// ── S4: Pick the full 2dp answer from a column sum ───────────────────────────
// Distractors vary the hundredths, tenths, or ones digit of the correct answer.

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { aH, bH, sumH } = genQ()
    const opts = new Set([sumH])
    for (const off of shuffle([-1, 1, -10, 10, -100, 100, -101, 11])) {
      if (opts.size >= 4) break
      const v = sumH + off
      if (v > 0) opts.add(v)
    }
    return { aH, bH, sumH, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { aH, bH, sumH, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === sumH })
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
            <div className="mission-subtitle">{t('mission.3D.pickAnswer')}</div>
            <ColSum aH={aH} bH={bH} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === sumH ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,3vw,20px)' }}
                  onClick={() => pick(opt)}
                  disabled={!!fb}
                >{fmt2(opt)}</button>
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
  const { aH, bH, sumH } = qs[qi]
  const expected = fmt2(sumH)

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
        <ColSum aH={aH} bH={bH} />
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

export default function Mission6_3D({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_3D' })
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
