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

// ── S0: Bubble pop — tap pairs that add to 10 ────────────────────────────────

function BubblePop({ onDone }) {
  const { t } = useTranslation()
  const nums = useMemo(() => shuffle([1, 2, 3, 4, 6, 7, 8, 9]), [])
  const [sel, setSel] = useState(null)
  const [popped, setPopped] = useState(new Set())
  const [shaking, setShaking] = useState(null)

  function tapBubble(i) {
    if (popped.has(i) || shaking != null) return
    if (sel === null) { setSel(i); return }
    if (sel === i) { setSel(null); return }
    const ok = nums[sel] + nums[i] === 10
    if (ok) {
      const next = new Set([...popped, sel, i])
      setPopped(next)
      setSel(null)
      if (next.size >= 8) setTimeout(onDone, 500)
    } else {
      setShaking(i)
      setTimeout(() => { setSel(null); setShaking(null) }, 450)
    }
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-title">{t('mission.3A.pairUp')}</div>
        <div className="bubble-grid">
          {nums.map((n, i) => {
            if (popped.has(i)) return <div key={i} className="bond-bubble bond-bubble--ghost" />
            return (
              <div
                key={i}
                className={`bond-bubble${sel === i ? ' bond-bubble--selected' : ''}${shaking === i ? ' bond-bubble--shake' : ''}`}
                onClick={() => tapBubble(i)}
              >{n}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── S1: Pair-select — tap two from 5 that sum to 10 (correct to advance) ─────

function genPairRounds(count) {
  return Array.from({ length: count }, () => {
    const a = rnd(1, 9), b = 10 - a
    const pool = new Set([a, b])
    while (pool.size < 5) pool.add(rnd(1, 9))
    return shuffle([...pool])
  })
}

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genPairRounds(4), [])
  const [ri, setRi] = useState(0)
  const [sel, setSel] = useState(null)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const nums = rounds[Math.min(ri, rounds.length - 1)]

  function tap(i) {
    if (fb || done) return
    if (sel === null) { setSel(i); return }
    if (sel === i) { setSel(null); return }
    const ok = nums[sel] + nums[i] === 10
    setFb({ i1: sel, i2: i, ok })
    setTimeout(() => {
      setFb(null); setSel(null)
      if (ok) { if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3A.pairTip')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.3A.tapTwoMake10')}</div>
            <div className="mission-bigger-row">
              {nums.map((n, i) => {
                const inPair = fb && (i === fb.i1 || i === fb.i2)
                const cls = inPair ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong')
                  : sel === i ? ' mission-bigger-btn--selected' : ''
                return (
                  <button key={i} className={`mission-bigger-btn${cls}`} onClick={() => tap(i)} disabled={!!fb}>
                    {n}
                  </button>
                )
              })}
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

// ── S2: Reversed equation — "10 = ___ + N" ────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 5 }, () => {
    const n = rnd(1, 9)
    return { n, answer: String(10 - n) }
  }), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { n, answer } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = val === answer
    setFb(ok ? 'correct' : 'wrong')
    setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onNext() : setQi(i => i + 1) }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-gap-row" style={{ pointerEvents: 'none' }}>
          <div className="mission-gap-box" style={{ fontSize: 'clamp(22px,5vw,38px)' }}>10</div>
          <div className="mission-gap-box" style={{ fontSize: 'clamp(20px,4.5vw,34px)', background: 'none', border: 'none' }}>=</div>
          <div className={`mission-gap-box mission-gap-box--gap${fb === 'correct' ? ' mission-gap-box--correct' : fb === 'wrong' ? ' mission-gap-box--wrong' : ''}`}>
            {fb ? answer : '?'}
          </div>
          <div className="mission-gap-box" style={{ fontSize: 'clamp(20px,4.5vw,34px)', background: 'none', border: 'none' }}>+</div>
          <div className="mission-gap-box" style={{ fontSize: 'clamp(22px,5vw,38px)' }}>{n}</div>
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
    const isTrue = Math.random() < 0.5
    let a, b
    if (isTrue) { a = rnd(1, 9); b = 10 - a }
    else { do { a = rnd(1, 9); b = rnd(1, 9) } while (a + b === 10) }
    return { a, b, isTrue }
  })
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genTF(4), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, isTrue } = rounds[ri]

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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(24px,5.5vw,42px)', fontWeight: 700, margin: '0.4rem 0 1rem', textAlign: 'center' }}>
          {a} + {b} = 10
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

// ── S4: Staircase fill — spot the missing bond ────────────────────────────────

const STAIRCASE = [[1,9],[2,8],[3,7],[4,6],[5,5]]

function genStaircaseRounds(count) {
  const idxs = shuffle([0,1,2,3,4]).slice(0, count)
  return idxs.map(hi => {
    const others = STAIRCASE.filter((_, i) => i !== hi)
    const distractors = shuffle(others).slice(0, 3)
    const options = shuffle([[...STAIRCASE[hi]], ...distractors])
    return { hiddenIdx: hi, options }
  })
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genStaircaseRounds(4), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { hiddenIdx, options } = rounds[Math.min(ri, rounds.length - 1)]
  const [ca, cb] = STAIRCASE[hiddenIdx]

  function pick(a) {
    if (fb || done) return
    const ok = a === ca
    setFb({ a, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3A.staircaseTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.3A.whichMissing')}</div>
            <div className="staircase">
              {STAIRCASE.map(([a, b], i) => (
                <div key={i} className={`staircase-row${i === hiddenIdx ? ' staircase-row--hidden' : ''}`}>
                  {i === hiddenIdx ? '? + ? = 10' : `${a} + ${b} = 10`}
                </div>
              ))}
            </div>
            <div className="mission-bigger-row" style={{ marginTop: '0.8rem' }}>
              {options.map(([a, b]) => (
                <button
                  key={a}
                  className={`mission-bigger-btn${fb ? a === ca ? ' mission-bigger-btn--correct' : a === fb.a && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,2.8vw,20px)', padding: '0.5rem 0.7rem' }}
                  onClick={() => pick(a)}
                  disabled={!!fb}
                >{a} + {b}</button>
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

// ── S5: Odd one out ───────────────────────────────────────────────────────────

const BOND_PAIRS = [[1,9],[2,8],[3,7],[4,6]]

function genOddRounds(count) {
  return Array.from({ length: count }, () => {
    const sh = shuffle(BOND_PAIRS)
    const [p1, p2, p3] = sh
    const odd = shuffle(p3)[0]
    const nums = shuffle([...p1, ...p2, odd])
    return { nums, oddIdx: nums.indexOf(odd) }
  })
}

function S5({ onFinish }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genOddRounds(4), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { nums, oddIdx } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(i) {
    if (fb || done) return
    const ok = i === oddIdx
    setFb({ i, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) setDone(true); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.3A.bondTip')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.3A.tapOddOne')}</div>
            <div className="mission-bigger-row">
              {nums.map((n, i) => (
                <button
                  key={i}
                  className={`mission-bigger-btn${fb ? i === oddIdx ? ' mission-bigger-btn--correct' : i === fb.i && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(i)}
                  disabled={!!fb}
                >{n}</button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={done ? onFinish : undefined} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
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

export default function Mission2_3A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '2_3A' })
    setStep(6)
  }

  if (step === 0) return <BubblePop onDone={() => setStep(1)} />
  if (step === 1) return <S1 onNext={() => setStep(2)} />
  if (step === 2) return <S2 onNext={() => setStep(3)} />
  if (step === 3) return <S3 onNext={() => setStep(4)} />
  if (step === 4) return <S4 onNext={() => setStep(5)} />
  if (step === 5) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
