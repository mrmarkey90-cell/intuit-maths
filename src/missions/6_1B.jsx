import { Fragment, useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Two variants matching the L6_1B generator:
//   1dp: whole 10–99 + tenths (e.g. 43.7 → [43, 0.7])
//   2dp: whole 1–9  + hundredths (e.g. 3.42 → [3, 0.42])
function genQ() {
  if (Math.random() < 0.5) {
    const whole = rnd(10, 99)
    const tenths = rnd(1, 9)
    const number = Math.round((whole + tenths / 10) * 10) / 10
    return { number, parts: [whole, tenths / 10], displayNum: number.toFixed(1) }
  }
  const whole = rnd(1, 9)
  const hundredths = rnd(1, 99)
  const number = Math.round((whole + hundredths / 100) * 100) / 100
  return { number, parts: [whole, hundredths / 100], displayNum: number.toFixed(2) }
}

function fmtPart(p) {
  if (p % 1 === 0) return String(p)
  const r1 = Math.round(p * 10) / 10
  if (Math.abs(r1 - p) < 0.0001) return p.toFixed(1)
  return p.toFixed(2)
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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
        <span
          key={i}
          className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`}
        />
      ))}
    </div>
  )
}

// ── PartitionInput: decimal partition (whole + decimal remainder) ──────────────
// allowDecimal is derived per active box so the numpad matches what's expected.

function PartitionInput({ displayNum, parts, labels, hiddenIdxs, onComplete }) {
  const [filled, setFilled] = useState({})
  const [activeIdx, setActiveIdx] = useState(hiddenIdxs[0])
  const [wrongVal, setWrongVal] = useState(null)
  const [padKey, setPadKey] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)

  function submit(val) {
    if (isFlashing || wrongVal !== null) return
    if (Math.abs(parseFloat(val) - parts[activeIdx]) > 0.0001) {
      setWrongVal(val)
      setTimeout(() => { setWrongVal(null); setPadKey(k => k + 1) }, 700)
      return
    }
    const newFilled = { ...filled, [activeIdx]: true }
    setFilled(newFilled)
    const next = hiddenIdxs.find(i => !newFilled[i])
    if (next === undefined) {
      setIsFlashing(true)
      setTimeout(onComplete, 800)
    } else {
      setActiveIdx(next)
      setPadKey(k => k + 1)
    }
  }

  function bCls(i) {
    const hidden = hiddenIdxs.includes(i)
    const fil = filled[i]
    const active = i === activeIdx && hidden && !fil
    if (!hidden) return 'mission-gap-box mission-gap-box--wide'
    if (fil || isFlashing) return 'mission-gap-box mission-gap-box--wide mission-gap-box--correct'
    if (active) return `mission-gap-box mission-gap-box--wide${wrongVal !== null ? ' mission-gap-box--wrong' : ' mission-gap-box--active'}`
    return 'mission-gap-box mission-gap-box--wide'
  }

  function bVal(i) {
    const hidden = hiddenIdxs.includes(i)
    const fil = filled[i]
    const active = i === activeIdx && hidden && !fil
    if (!hidden || fil || isFlashing) return fmtPart(parts[i])
    if (active) return wrongVal ?? '?'
    return ''
  }

  return (
    <>
      <div className="mission-ba-number" style={{ fontSize: 'clamp(28px, 7vw, 52px)' }}>{displayNum}</div>
      <div className="mission-partition-boxes">
        {parts.map((_, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="mission-partition-plus">+</span>}
            <div className="mission-partition-col">
              <div className={bCls(i)}>{bVal(i)}</div>
              <div className="mission-partition-label">{labels[i]}</div>
            </div>
          </Fragment>
        ))}
      </div>
      <NumberPad
        key={padKey}
        onSubmit={submit}
        stage={1}
        allowDecimal={parts[activeIdx] % 1 !== 0}
        disabled={isFlashing || wrongVal !== null}
      />
    </>
  )
}

// ── Screen 1: Which is bigger? (mixed decimals) ───────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      // keep both numbers in the same decimal range per round
      const use1dp = Math.random() < 0.5
      const makeNum = () => use1dp
        ? Math.round((rnd(10, 99) + rnd(1, 9) / 10) * 10) / 10
        : Math.round((rnd(1, 9) + rnd(1, 99) / 100) * 100) / 100
      const a = makeNum(), b = makeNum()
      if (Math.abs(a - b) > 0.05) out.push({ a, b, dp: use1dp ? 1 : 2 })
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, dp } = rounds[Math.min(idx, rounds.length - 1)]
  const aDisp = a.toFixed(dp)
  const bDisp = b.toFixed(dp)
  const biggerDisp = (a > b ? a : b).toFixed(dp)

  function pick(n) {
    if (fb || done) return
    setFb({ biggerDisp, chosen: n })
    setTimeout(() => {
      setFb(null)
      if (idx + 1 >= rounds.length) setDone(true)
      else setIdx(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.6_1B.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
            <div className="mission-bigger-row">
              {[aDisp, bDisp].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === fb.biggerDisp ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(18px, 4vw, 28px)' }}
                  onClick={() => pick(n)}
                  disabled={!!fb}
                >
                  {n}
                </button>
              ))}
            </div>
            <RoundDots total={rounds.length} current={idx} />
          </>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: done ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: Teach — watch a decimal split into whole + decimal part ─────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const example = useMemo(() => {
    const whole = rnd(10, 99), tenths = rnd(1, 9)
    const number = Math.round((whole + tenths / 10) * 10) / 10
    return { number, parts: [whole, tenths / 10], displayNum: number.toFixed(1) }
  }, [])
  const labels = [t('mission.6_1B.whole'), t('mission.6_1B.decimal')]
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setPhase(1), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1B.watchSplit')}</div>
        <div className="mission-ba-number" style={{ fontSize: 'clamp(28px, 7vw, 52px)' }}>{example.displayNum}</div>
        {phase >= 1 && (
          <div className="mission-partition-boxes">
            {example.parts.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span
                    className="mission-partition-plus"
                    style={{ animation: 'mission-chip-pop 0.25s 0.1s ease-out both' }}
                  >+</span>
                )}
                <div
                  className="mission-partition-col"
                  style={{ animation: `mission-chip-pop 0.3s ${i * 200}ms ease-out both` }}
                >
                  <div className="mission-gap-box mission-gap-box--wide">{fmtPart(p)}</div>
                  <div className="mission-partition-label">{labels[i]}</div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
        {phase >= 1 && (
          <div
            className="mission-subtitle"
            style={{ animation: 'mission-chip-pop 0.35s 0.55s ease-out both' }}
          >
            {t('mission.6_1B.splitDone')}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={onNext}
          style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}
        >
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Fill the missing part (one box hidden) ──────────────────────────

function S3OneBox({ onNext }) {
  const { t } = useTranslation()
  const labels = [t('mission.6_1B.whole'), t('mission.6_1B.decimal')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, hiddenIdxs: [rnd(0, 1)] }
    })
  , [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onNext()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1B.fillMissing')}</div>
        <PartitionInput
          key={idx}
          displayNum={q.displayNum}
          parts={q.parts}
          labels={labels}
          hiddenIdxs={q.hiddenIdxs}
          onComplete={advance}
        />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: Fill both parts ─────────────────────────────────────────────────

function S4AllParts({ onNext }) {
  const { t } = useTranslation()
  const labels = [t('mission.6_1B.whole'), t('mission.6_1B.decimal')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, hiddenIdxs: [0, 1] }
    })
  , [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onNext()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1B.fillAll')}</div>
        <PartitionInput
          key={idx}
          displayNum={q.displayNum}
          parts={q.parts}
          labels={labels}
          hiddenIdxs={q.hiddenIdxs}
          onComplete={advance}
        />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 5: More all-parts (auto-finishes) ──────────────────────────────────

function S5More({ onFinish }) {
  const { t } = useTranslation()
  const labels = [t('mission.6_1B.whole'), t('mission.6_1B.decimal')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, hiddenIdxs: [0, 1] }
    })
  , [])
  const [idx, setIdx] = useState(0)
  const q = questions[idx]

  function advance() {
    if (idx + 1 >= questions.length) onFinish()
    else setIdx(i => i + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6_1B.fillAll')}</div>
        <PartitionInput
          key={idx}
          displayNum={q.displayNum}
          parts={q.parts}
          labels={labels}
          hiddenIdxs={q.hiddenIdxs}
          onComplete={advance}
        />
        <RoundDots total={questions.length} current={idx} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Completion ────────────────────────────────────────────────────────────────

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

export default function Mission6_1B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_1B' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3OneBox onNext={() => setStep(3)} />
  if (step === 3) return <S4AllParts onNext={() => setStep(4)} />
  if (step === 4) return <S5More onFinish={finish} />
  return <Complete onDone={onComplete} />
}
