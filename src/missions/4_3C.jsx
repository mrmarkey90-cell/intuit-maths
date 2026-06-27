import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function genQ() { const a = rnd(100, 899), b = rnd(100, 899); return { a, b, sum: a + b } }

// Column labels per language for S1
const COL_KEYS = ['colTotalUnits', 'colTotalTens', 'colTotalHundreds']

function ColSum({ a, b }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{a}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">+</span>
          <span className="insight-column-number">{b}</span>
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

// ── S0: Mini-game — carry radar (single-digit pairs, carry or no carry) ───────
// Five quick-fire rounds: show a + b (both 1-9), does it carry to next column?

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const r = []
    while (r.length < 5) {
      const a = rnd(1, 9), b = rnd(1, 9)
      const carries = a + b >= 10
      if (r.filter(x => x.carries).length < 3 || !carries) r.push({ a, b, carries })
    }
    return shuffle(r)
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, carries } = rounds[Math.min(ri, rounds.length - 1)]
  const [done, setDone] = useState(false)

  function pick(chosen) {
    if (fb || done) return
    const ok = chosen === carries
    setFb({ chosen, ok })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3C.carryRadar')}</div>
        {done ? (
          <div className="mission-title">{t('mission.3C.carryTip')}</div>
        ) : (
          <>
            <div style={{ background: '#f0f9ff', borderRadius: 14, padding: '1rem 1.6rem', fontSize: 'clamp(44px,10vw,72px)', fontWeight: 900, textAlign: 'center', color: '#0369a1', margin: '0.4rem 0 0.8rem' }}>
              {a} + {b}
            </div>
            <div className="mission-bigger-row">
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  className={`mission-bigger-btn${fb ? v === carries ? ' mission-bigger-btn--correct' : v === fb.chosen && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,3vw,22px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{v ? t('mission.3C.carryOver') : t('mission.3C.noCarry')}</button>
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

// ── S1: What does this column add to? (units/tens/hundreds chosen randomly) ───

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b } = genQ()
    const colIdx = rnd(0, 2)
    const digitA = Math.floor(a / (10 ** colIdx)) % 10
    const digitB = Math.floor(b / (10 ** colIdx)) % 10
    const correct = digitA + digitB
    const opts = new Set([correct])
    while (opts.size < 4) { const d = correct + rnd(-4, 4); if (d >= 0 && d !== correct) opts.add(d) }
    return { a, b, colIdx, correct, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, colIdx, correct, opts } = rounds[Math.min(ri, rounds.length - 1)]

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
          <div className="mission-title">{t('mission.3C.unitsFirstTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t(`mission.3C.${COL_KEYS[colIdx]}`)}</div>
            <ColSum a={a} b={b} />
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

// ── S2: True or false ─────────────────────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => { const { a, b, sum } = genQ(); return { a, b, shown: sum, isTrue: true } })
    const falses = Array.from({ length: 2 }, () => {
      const { a, b, sum } = genQ()
      const off = [-1, 1, -10, 10, -100, 100][Math.floor(Math.random() * 6)]
      return { a, b, shown: sum + off, isTrue: false }
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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(18px,4vw,30px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {a} + {b} = {shown}
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

// ── S3: Fix the digit — one digit in the answer is hidden ─────────────────────

function genFixRounds(count) {
  return Array.from({ length: count }, () => {
    const { a, b, sum } = genQ()
    const str = String(sum)
    const pos = rnd(0, str.length - 1)
    const correct = parseInt(str[pos], 10)
    const opts = new Set([correct])
    while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
    const display = str.slice(0, pos) + '?' + str.slice(pos + 1)
    return { a, b, display, correct, opts: shuffle([...opts]) }
  })
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genFixRounds(3), [])
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
            <div className="mission-subtitle">{t('mission.3C.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.2rem', fontSize: 'clamp(18px,4vw,30px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0' }}>
              {a} + {b} = <span style={{ color: '#4f46e5', fontSize: 'clamp(22px,5vw,38px)' }}>{display}</span>
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

// ── S4: Pick the answer (2×2 grid) ────────────────────────────────────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, sum } = genQ()
    const opts = new Set([sum])
    for (const d of shuffle([-1, 1, -10, 10, -100, 100, -11, 110])) {
      if (opts.size >= 4) break
      const v = sum + d
      if (v > 0) opts.add(v)
    }
    return { a, b, sum, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, sum, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === sum })
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
            <div className="mission-subtitle">{t('mission.3C.pickAnswer')}</div>
            <ColSum a={a} b={b} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === sum ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(16px,3.2vw,22px)' }}
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
  const { a, b, sum } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = parseInt(val, 10) === sum
    setFb(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    else setTimeout(() => setFb(null), 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <ColSum a={a} b={b} />
        <RoundDots total={qs.length} current={qi} />
        <NumberPad key={qi} onSubmit={submit} allowDecimal={false} disabled={!!fb} />
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

export default function Mission4_3C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '4_3C' })
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
