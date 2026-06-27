import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function fmt(v) { return String(v) }

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

// ── Reusable: tap one of two numbers (bigger or smaller) ─────────────────────
// getTarget(a, b) → correct value; advance always (quick-paced)

function TapPair({ step, label, genPairs, getTarget, doneTip, onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(genPairs, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const [a, b] = rounds[Math.min(ri, rounds.length - 1)]
  const target = getTarget(a, b)

  function pick(v) {
    if (fb || done) return
    setFb({ v, ok: v === target })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) setDone(true)
      else setRi(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={step} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{doneTip}</div>
        ) : (
          <>
            <div className="mission-title">{label}</div>
            <div className="mission-bigger-row">
              {[a, b].map(v => (
                <button
                  key={v}
                  className={`mission-bigger-btn${fb ? v === target ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{fmt(v)}</button>
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

// ── Screen 1: tap the bigger number ──────────────────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  return (
    <TapPair
      step={1}
      label={t('mission.2B.whichBigger')}
      genPairs={() => Array.from({ length: 4 }, () => {
        let a = rnd(1, 20), b = rnd(1, 20)
        while (a === b) b = rnd(1, 20)
        return shuffle([a, b])
      })}
      getTarget={(a, b) => Math.max(a, b)}
      doneTip={t('mission.1_2B.bigTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 2: tap the smaller number ─────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  return (
    <TapPair
      step={2}
      label={t('mission.2B.whichSmaller')}
      genPairs={() => Array.from({ length: 4 }, () => {
        let a = rnd(1, 20), b = rnd(1, 20)
        while (a === b) b = rnd(1, 20)
        return shuffle([a, b])
      })}
      getTarget={(a, b) => Math.min(a, b)}
      doneTip={t('mission.1_2B.smallTip')}
      onNext={onNext}
    />
  )
}

// ── Screen 3: pick < > or = (requires correct before advancing) ───────────────

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    let a = rnd(1, 20), b = rnd(1, 20)
    while (a === b) b = rnd(1, 20)
    return { a, b, correct: a < b ? '<' : '>' }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, correct } = rounds[ri]

  function pick(sym) {
    if (fb) return
    const ok = sym === correct
    setFb({ sym, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) {
        if (ri + 1 >= rounds.length) onNext()
        else setRi(i => i + 1)
      }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2B.pickSymbol')}</div>
        <div className="mission-gap-row" style={{ pointerEvents: 'none', marginBottom: '1rem' }}>
          <div className="mission-gap-box">{fmt(a)}</div>
          <div className="mission-gap-box mission-gap-box--gap" style={{ minWidth: 44, width: 44 }}>?</div>
          <div className="mission-gap-box">{fmt(b)}</div>
        </div>
        <div className="mission-bigger-row">
          {['<', '>', '='].map(sym => (
            <button
              key={sym}
              className={`mission-bigger-btn${fb
                ? sym === correct ? ' mission-bigger-btn--correct'
                : sym === fb.sym && !fb.ok ? ' mission-bigger-btn--wrong'
                : '' : ''}`}
              style={{ width: 'clamp(60px, 12vw, 88px)', height: 'clamp(60px, 12vw, 88px)', fontSize: 'clamp(22px, 5vw, 38px)' }}
              onClick={() => pick(sym)}
              disabled={!!fb}
            >{sym}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Screen 4: true or false? (requires correct before advancing) ──────────────

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    let a = rnd(1, 20), b = rnd(1, 20)
    while (a === b) b = rnd(1, 20)
    const showGT = Math.random() < 0.5
    return { a, b, showGT, isTrue: showGT ? a > b : a < b }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, showGT, isTrue } = rounds[ri]

  function pick(chosen) {
    if (fb) return
    const ok = chosen === isTrue
    setFb({ chosen, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) {
        if (ri + 1 >= rounds.length) onNext()
        else setRi(i => i + 1)
      }
    }, 700)
  }

  const statementStyle = { background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.2rem', fontSize: 'clamp(22px, 5vw, 38px)', fontWeight: 700, margin: '0.4rem 0 1rem', textAlign: 'center', letterSpacing: '0.08em' }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2B.trueOrFalse')}</div>
        <div style={statementStyle}>{fmt(a)} {showGT ? '>' : '<'} {fmt(b)}</div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button
              key={String(v)}
              className={`mission-bigger-btn${fb
                ? v === isTrue ? ' mission-bigger-btn--correct'
                : v === fb.chosen && !fb.ok ? ' mission-bigger-btn--wrong'
                : '' : ''}`}
              style={{ fontSize: 'clamp(16px, 3.5vw, 26px)', width: 'clamp(90px, 18vw, 140px)' }}
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

// ── Screen 5: final mix — bigger/smaller alternate, advance always ─────────────

function S5({ onFinish }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, (_, i) => {
    let a = rnd(1, 20), b = rnd(1, 20)
    while (a === b) b = rnd(1, 20)
    return { a, b, wantBig: i % 2 === 0 }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, wantBig } = rounds[ri]
  const target = wantBig ? Math.max(a, b) : Math.min(a, b)

  function pick(v) {
    if (fb) return
    setFb({ v, ok: v === target })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onFinish()
      else setRi(i => i + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-title">{wantBig ? t('mission.2B.whichBigger') : t('mission.2B.whichSmaller')}</div>
        <div className="mission-bigger-row">
          {[a, b].map(v => (
            <button
              key={v}
              className={`mission-bigger-btn${fb ? v === target ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(v)}
              disabled={!!fb}
            >{fmt(v)}</button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
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

export default function Mission1_2B({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_2B' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
