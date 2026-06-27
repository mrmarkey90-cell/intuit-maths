import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

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

// Generate a bridging-10 question: both addends 6-9
function genBridge2() {
  return { a: rnd(6, 9), b: rnd(6, 9) }
}

// ── S0: Bridge visualiser — see a ten-frame, how many more to reach 10? ───────
// Teaches the first step of the bridging strategy

const VIZ_ROUNDS = [
  { n: 8, opts: [1, 2, 3] },
  { n: 7, opts: [2, 3, 4] },
  { n: 9, opts: [1, 2, 3] },
]

function BridgeViz({ onDone }) {
  const { t } = useTranslation()
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { n, opts } = VIZ_ROUNDS[ri]
  const correct = 10 - n

  function pick(opt) {
    if (fb) return
    const ok = opt === correct
    setFb({ opt, ok })
    if (ok) {
      setTimeout(() => {
        if (ri + 1 >= VIZ_ROUNDS.length) onDone()
        else { setRi(ri + 1); setFb(null) }
      }, 900)
    } else {
      setTimeout(() => setFb(null), 600)
    }
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.3B.howManyMore')}</div>
        <div className="ten-frame">
          {Array(10).fill(null).map((_, i) => (
            <div
              key={i}
              className={`tf-cell${i < n ? ' tf-cell--pre' : fb?.ok ? ' tf-cell--player' : ' tf-cell--empty'}`}
            />
          ))}
        </div>
        <div className="mission-bigger-row" style={{ marginTop: '0.6rem' }}>
          {opts.map(opt => (
            <button
              key={opt}
              className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)}
              disabled={!!fb}
            >{opt}</button>
          ))}
        </div>
        <RoundDots total={VIZ_ROUNDS.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S1: Tap the answer — 4 options for N + M = ? ──────────────────────────────

function genTapRounds(count) {
  return Array.from({ length: count }, () => {
    const { a, b } = genBridge2()
    const correct = a + b
    const opts = new Set([correct])
    while (opts.size < 4) { const d = correct + rnd(-3, 3); if (d > 0 && d !== correct) opts.add(d) }
    return { a, b, correct, opts: shuffle([...opts]) }
  })
}

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genTapRounds(4), [])
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
          <div className="mission-title">{t('mission.3B.bridgeTip')}</div>
        ) : (
          <>
            <div className="mission-title" style={{ fontSize: 'clamp(30px,7vw,52px)', marginBottom: '0.5rem' }}>
              {a} + {b} = ?
            </div>
            <div className="mission-bigger-row">
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ width: 'clamp(64px,13vw,90px)' }}
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
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── S2: NumPad — type the full answer ────────────────────────────────────────

function S2({ onNext }) {
  const qs = useMemo(() => Array.from({ length: 5 }, genBridge2), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = parseInt(val) === a + b
    setFb(ok ? 'correct' : 'wrong')
    setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onNext() : setQi(i => i + 1) }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div style={{ fontSize: 'clamp(28px,6.5vw,50px)', fontWeight: 700, textAlign: 'center', marginBottom: '0.3rem', color: fb === 'correct' ? '#2e7d32' : fb === 'wrong' ? '#c62828' : '#1f2937' }}>
          {a} + {b} = ?
        </div>
        <RoundDots total={qs.length} current={qi} />
        <NumberPad key={qi} onSubmit={submit} allowDecimal={false} disabled={!!fb} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S3: True or false ─────────────────────────────────────────────────────────

function genTF(count) {
  return Array.from({ length: count }, () => {
    const { a, b } = genBridge2()
    const real = a + b
    const isTrue = Math.random() < 0.5
    const shown = isTrue ? real : real + (Math.random() < 0.5 ? 1 : -1)
    return { a, b, shown, isTrue: shown === real }
  })
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genTF(4), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, shown, isTrue } = rounds[ri]

  function pick(chosen) {
    if (fb) return
    const ok = chosen === isTrue
    setFb({ chosen, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) onNext(); else setRi(i => i + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(22px,5vw,38px)', fontWeight: 700, margin: '0.4rem 0 1rem', textAlign: 'center' }}>
          {a} + {b} = {shown}
        </div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button
              key={String(v)}
              className={`mission-bigger-btn${fb ? v === isTrue ? ' mission-bigger-btn--correct' : v === fb.chosen && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

// ── S4: Bridge amount — how much of B fills the 10? ──────────────────────────
// E.g. 7 + 8: 7 needs 3 more → tap 3

function bridgeOpts(correct) {
  const pool = new Set([correct])
  for (const d of [correct - 1, correct + 1, correct + 2, correct - 2]) {
    if (d >= 1 && d <= 9) pool.add(d)
    if (pool.size >= 3) break
  }
  return shuffle([...pool])
}

function genBridgeRounds(count) {
  return Array.from({ length: count }, () => {
    const { a, b } = genBridge2()
    const bridgeAmt = 10 - a
    return { a, b, bridgeAmt }
  })
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genBridgeRounds(4), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, bridgeAmt } = rounds[Math.min(ri, rounds.length - 1)]
  const opts = useMemo(() => rounds.map(r => bridgeOpts(r.bridgeAmt)), [rounds])

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === bridgeAmt })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1)
    }, 900)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3B.bridgeTip2')}</div>
        ) : (
          <>
            <div className="mission-title" style={{ fontSize: 'clamp(28px,6.5vw,50px)', marginBottom: '0.3rem' }}>
              {a} + {b}
            </div>
            <div className="mission-subtitle">{t('mission.3B.howMuchBridges')}</div>
            {fb?.ok && (
              <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 'clamp(16px,3vw,22px)', textAlign: 'center', marginTop: '0.3rem' }}>
                {a} + {bridgeAmt} = 10 ✓
              </div>
            )}
            <div className="mission-bigger-row" style={{ marginTop: '0.5rem' }}>
              {opts[ri].map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === bridgeAmt ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ width: 'clamp(70px,14vw,100px)' }}
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
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── S5: Leftover chain — "N + M = 10 + ___" (NumPad, correct to advance) ─────

function S5({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, () => {
    const { a, b } = genBridge2()
    return { a, b, answer: String(b - (10 - a)) }
  }), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, answer } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = val === answer
    setFb(ok ? 'correct' : 'wrong')
    if (ok) {
      setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    } else {
      setTimeout(() => setFb(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div style={{ fontSize: 'clamp(22px,5vw,38px)', fontWeight: 700, textAlign: 'center', marginBottom: '0.3rem', color: fb === 'correct' ? '#2e7d32' : fb === 'wrong' ? '#c62828' : '#1f2937' }}>
          {a} + {b} = 10 + ?
        </div>
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
        <div className="mission-complete-icon">🏆</div>
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

export default function Mission2_3B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_3B' })
    setStep(6)
  }

  if (step === 0) return <BridgeViz onDone={() => setStep(1)} />
  if (step === 1) return <S1 onNext={() => setStep(2)} />
  if (step === 2) return <S2 onNext={() => setStep(3)} />
  if (step === 3) return <S3 onNext={() => setStep(4)} />
  if (step === 4) return <S4 onNext={() => setStep(5)} />
  if (step === 5) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
