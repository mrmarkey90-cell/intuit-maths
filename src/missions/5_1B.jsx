import { Fragment, useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

function genQ() {
  const whole = rnd(1, 9)
  const tenths = rnd(1, 9)
  const number = Math.round((whole + tenths / 10) * 10) / 10
  return { number, parts: [whole, tenths / 10], displayNum: number.toFixed(1) }
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

// ── PartitionInput: decimal partition (whole + tenths) ────────────────────────
// allowDecimal on NumberPad; float comparison for tenths (e.g. 0.7).

function PartitionInput({ displayNum, parts, labels, hiddenIdxs, onComplete }) {
  const [filled, setFilled] = useState({})
  const [activeIdx, setActiveIdx] = useState(hiddenIdxs[0])
  const [wrongVal, setWrongVal] = useState(null)
  const [padKey, setPadKey] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)

  function fmtPart(p) {
    return p % 1 === 0 ? String(p) : p.toFixed(1)
  }

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
      <div className="mission-ba-number">{displayNum}</div>
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
        allowDecimal
        disabled={isFlashing || wrongVal !== null}
      />
    </>
  )
}

// ── Screen 1: Which is bigger? (decimals) ─────────────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(1, 9) + rnd(1, 9) / 10
      const b = rnd(1, 9) + rnd(1, 9) / 10
      if (Math.abs(a - b) > 0.05) out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const aDisp = a.toFixed(1)
  const bDisp = b.toFixed(1)
  const bigger = a > b ? a : b
  const biggerDisp = bigger.toFixed(1)

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
          <div className="mission-title">{t('mission.5_1B.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
            <div className="mission-bigger-row">
              {[aDisp, bDisp].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === fb.biggerDisp ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

// ── Screen 2: Decimal split into whole + tenths (two examples) ───────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 2 }, () => {
    const whole = rnd(1, 9), tenths = rnd(1, 9)
    const num = Math.round((whole + tenths / 10) * 10) / 10
    return { displayNum: num.toFixed(1), parts: [whole, tenths / 10] }
  }), [])
  const labels = [t('mission.5_1B.whole'), t('mission.5_1B.tenths')]
  const [exIdx, setExIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const ex = examples[exIdx]

  function fmtPart(p) {
    return p % 1 === 0 ? String(p) : p.toFixed(1)
  }

  useEffect(() => {
    setPhase(0)
    const timer = setTimeout(() => setPhase(1), 1000)
    return () => clearTimeout(timer)
  }, [exIdx])

  function handleNext() {
    if (exIdx < examples.length - 1) setExIdx(i => i + 1)
    else onNext()
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_1B.watchSplit')}</div>
        <div className="mission-ba-number">{ex.displayNum}</div>
        {phase >= 1 && (
          <div className="mission-partition-boxes">
            {ex.parts.map((p, i) => (
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
            {t('mission.5_1B.splitDone')}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button
          className="mission-next-btn"
          onClick={handleNext}
          style={{ visibility: phase >= 1 ? 'visible' : 'hidden' }}
        >
          {exIdx < examples.length - 1 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Fill the missing part (one of two boxes hidden) ─────────────────

function S3OneBox({ onNext }) {
  const { t } = useTranslation()
  const labels = [t('mission.5_1B.whole'), t('mission.5_1B.tenths')]
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
        <div className="mission-subtitle">{t('mission.5_1B.fillMissing')}</div>
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
  const labels = [t('mission.5_1B.whole'), t('mission.5_1B.tenths')]
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
        <div className="mission-subtitle">{t('mission.5_1B.fillAll')}</div>
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
  const labels = [t('mission.5_1B.whole'), t('mission.5_1B.tenths')]
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
        <div className="mission-subtitle">{t('mission.5_1B.fillAll')}</div>
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

export default function Mission5_1B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_1B' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3OneBox onNext={() => setStep(3)} />
  if (step === 3) return <S4AllParts onNext={() => setStep(4)} />
  if (step === 4) return <S5More onFinish={finish} />
  return <Complete onDone={onComplete} />
}
