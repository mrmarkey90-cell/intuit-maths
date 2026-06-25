import { Fragment, useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

function genQ() {
  const h = rnd(1, 9)
  const t = rnd(0, 9)
  const u = rnd(0, 9)
  return { number: h * 100 + t * 10 + u, parts: [h * 100, t * 10, u] }
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

// ── PartitionInput: partition display + numpad ────────────────────────────────
// Uses --wide boxes to accommodate 3-digit parts (e.g. "400", "30").

function PartitionInput({ displayNum, parts, labels, hiddenIdxs, onComplete }) {
  const [filled, setFilled] = useState({})
  const [activeIdx, setActiveIdx] = useState(hiddenIdxs[0])
  const [wrongVal, setWrongVal] = useState(null)
  const [padKey, setPadKey] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)

  function submit(val) {
    if (isFlashing || wrongVal !== null) return
    if (parseInt(val, 10) !== parts[activeIdx]) {
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
    if (!hidden || fil || isFlashing) return String(parts[i])
    if (active) return wrongVal ?? '?'
    return ''
  }

  return (
    <>
      <div className="mission-ba-number" style={{ fontSize: 'clamp(36px, 9vw, 64px)' }}>{displayNum}</div>
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
        disabled={isFlashing || wrongVal !== null}
      />
    </>
  )
}

// ── Screen 1: Which is bigger? (3-digit) ─────────────────────────────────────

function S1Bigger({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const out = []
    while (out.length < 4) {
      const a = rnd(100, 999), b = rnd(100, 999)
      if (a !== b) out.push([a, b])
    }
    return out
  }, [])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(idx, rounds.length - 1)]
  const bigger = Math.max(a, b)

  function pick(n) {
    if (fb || done) return
    setFb({ bigger, chosen: n })
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
          <div className="mission-title">{t('mission.3_1B.greatComparing')}</div>
        ) : (
          <>
            <div className="mission-title">{t('mission.1_1A.whichIsBigger')}</div>
            <div className="mission-bigger-row">
              {[a, b].map(n => (
                <button
                  key={n}
                  className={`mission-bigger-btn${fb ? n === fb.bigger ? ' mission-bigger-btn--correct' : n === fb.chosen ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(22px, 5vw, 38px)' }}
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

// ── Screen 2: Watch the number split into H + T + U (two examples) ──────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 2 }, () => {
    const h = rnd(1, 9), ten = rnd(1, 9), u = rnd(1, 9)
    const num = h * 100 + ten * 10 + u
    return { displayNum: String(num), parts: [h * 100, ten * 10, u] }
  }), [])
  const labels = [t('mission.3_1B.hundreds'), t('mission.3_1B.tens'), t('mission.3_1B.units')]
  const [exIdx, setExIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const ex = examples[exIdx]

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
        <div className="mission-subtitle">{t('mission.3_1B.watchSplit')}</div>
        <div className="mission-ba-number" style={{ fontSize: 'clamp(36px, 9vw, 64px)' }}>{ex.displayNum}</div>
        {phase >= 1 && (
          <div className="mission-partition-boxes">
            {ex.parts.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span
                    className="mission-partition-plus"
                    style={{ animation: `mission-chip-pop 0.25s ${i * 0.15}s ease-out both` }}
                  >+</span>
                )}
                <div
                  className="mission-partition-col"
                  style={{ animation: `mission-chip-pop 0.3s ${i * 200}ms ease-out both` }}
                >
                  <div className="mission-gap-box mission-gap-box--wide">{p}</div>
                  <div className="mission-partition-label">{labels[i]}</div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
        {phase >= 1 && (
          <div
            className="mission-subtitle"
            style={{ animation: 'mission-chip-pop 0.35s 0.7s ease-out both' }}
          >
            {t('mission.3_1B.splitDone')}
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

// ── Screen 3: Fill the missing part (one of three boxes hidden) ───────────────

function S3OneBox({ onNext }) {
  const { t } = useTranslation()
  const labels = [t('mission.3_1B.hundreds'), t('mission.3_1B.tens'), t('mission.3_1B.units')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, displayNum: String(q.number), hiddenIdxs: [rnd(0, 2)] }
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
        <div className="mission-subtitle">{t('mission.3_1B.fillMissing')}</div>
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

// ── Screen 4: Fill all three parts ───────────────────────────────────────────

function S4AllParts({ onNext }) {
  const { t } = useTranslation()
  const labels = [t('mission.3_1B.hundreds'), t('mission.3_1B.tens'), t('mission.3_1B.units')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, displayNum: String(q.number), hiddenIdxs: [0, 1, 2] }
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
        <div className="mission-subtitle">{t('mission.3_1B.fillAll')}</div>
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
  const labels = [t('mission.3_1B.hundreds'), t('mission.3_1B.tens'), t('mission.3_1B.units')]
  const questions = useMemo(() =>
    Array.from({ length: 3 }, () => {
      const q = genQ()
      return { ...q, displayNum: String(q.number), hiddenIdxs: [0, 1, 2] }
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
        <div className="mission-subtitle">{t('mission.3_1B.fillAll')}</div>
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

export default function Mission3_1B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '3_1B' })
    setStep(5)
  }

  if (step === 0) return <S1Bigger onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3OneBox onNext={() => setStep(3)} />
  if (step === 3) return <S4AllParts onNext={() => setStep(4)} />
  if (step === 4) return <S5More onFinish={finish} />
  return <Complete onDone={onComplete} />
}
