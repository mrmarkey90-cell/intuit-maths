import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function genQ() { const a = rnd(21, 49), b = rnd(21, 49); return { a, b, sum: a + b } }

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

// ── S0: Mini-game — tap two chips that add to the target ──────────────────────

function genMiniRound() {
  let a, b
  do { a = rnd(21, 49); b = rnd(21, 49) } while (a + b > 90)
  const target = a + b
  const pool = [a, b]
  let tries = 0
  while (pool.length < 4 && tries < 200) {
    const c = rnd(21, 49)
    if (!pool.includes(c) && pool.every(x => x + c !== target)) pool.push(c)
    tries++
  }
  while (pool.length < 4) { const c = rnd(21, 49); if (!pool.includes(c) && pool.every(x => x + c !== target)) pool.push(c) }
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
        <div className="mission-subtitle">{t('mission.3C.tapPair')}</div>
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

// ── S1: What do the units add to? (4-option pick) ─────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b } = genQ()
    const correct = (a % 10) + (b % 10)
    const opts = new Set([correct])
    while (opts.size < 4) { const d = correct + rnd(-4, 4); if (d >= 0 && d !== correct) opts.add(d) }
    return { a, b, correct, opts: shuffle([...opts]) }
  }), [])
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
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3C.unitsFirstTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3C.unitsTotal')}</div>
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

// ── S2: Write the units digit of the total ────────────────────────────────────
// Shows units digits a+b and the total; asks which digit goes in the answer.

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    const ua = rnd(1, 9), ub = rnd(1, 9)
    const total = ua + ub
    const correct = total % 10
    const opts = new Set([correct])
    while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
    return { ua, ub, total, correct, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { ua, ub, total, correct, opts } = rounds[ri]

  function pick(opt) {
    if (fb) return
    const ok = opt === correct
    setFb({ opt, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) onNext(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3C.writeDigit')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', margin: '0.4rem 0 0.8rem' }}>
          <div style={{ fontSize: 'clamp(32px,7vw,54px)', fontWeight: 700, color: '#1f2937' }}>{ua}</div>
          <div style={{ fontSize: 'clamp(28px,6vw,46px)', fontWeight: 700, color: '#0ea5e9' }}>+ {ub}</div>
          <div style={{ height: 3, background: '#1f2937', width: 'clamp(56px,12vw,88px)', margin: '2px 0' }} />
          <div style={{ fontSize: 'clamp(32px,7vw,54px)', fontWeight: 900, color: '#6b7280' }}>{total}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)' }}>
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
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S3: True or false — is this column sum correct? ───────────────────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => { const { a, b, sum } = genQ(); return { a, b, shown: sum, isTrue: true } })
    const falses = Array.from({ length: 2 }, () => {
      const { a, b, sum } = genQ()
      const off = [-1, 1, -10, 10][Math.floor(Math.random() * 4)]
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
      <Progress step={3} />
      <div className="mission-body">
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(22px,5vw,38px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
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

// ── S4: Pick the answer (2×2 grid) ────────────────────────────────────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, sum } = genQ()
    const opts = new Set([sum])
    for (const d of shuffle([-1, 1, -10, 10, -11, 11])) {
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
          <div className="mission-title">{t('mission.3C.carryTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3C.pickAnswer')}</div>
            <ColSum a={a} b={b} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(280px,58vw)' }}>
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === sum ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

export default function Mission3_3C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_3C' })
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
