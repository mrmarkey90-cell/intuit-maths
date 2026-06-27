import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// ── Level 5: round to nearest whole (1dp decimals stored as tenths ints) ──────
// n_t = tenths integer (e.g. 37 = 3.7)
function loN(n_t) { return Math.floor(n_t / 10) }       // whole number (e.g. 3)
function hiN(n_t) { return loN(n_t) + 1 }               // whole number (e.g. 4)
function roundedN(n_t) { return Math.round(n_t / 10) }  // whole number (e.g. 4)
function fmtN(n_t) { return (n_t / 10).toFixed(1) }     // display "3.7"
function genClear() { let n; do { n = rnd(11, 99) } while (n % 10 === 0 || n % 10 === 5); return n }
function genAny() { let n; do { n = rnd(11, 99) } while (n % 10 === 0); return n }
const HALFW_POOL = [15, 25, 35, 45, 55, 65, 75, 85, 95]

// Note: lo_val and hi_val are whole numbers, not tenths integers
function makeLine(n_t) {
  const l = loN(n_t), h = hiN(n_t), c = roundedN(n_t)
  return {
    fmtN: fmtN(n_t), fmtLo: String(l), fmtHi: String(h),
    lo_val: l, hi_val: h, correct_val: c,
    pct: (n_t % 10) / 10 * 100,  // e.g. 37 → 70%
  }
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

function NumberLine({ pct, fmtN, fmtLo, fmtHi }) {
  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '0 auto 1.8rem', padding: '2rem 1.8rem 1.6rem', position: 'relative', boxSizing: 'border-box' }}>
      <div style={{ height: 4, background: '#c0baf0', borderRadius: 2, position: 'relative' }}>
        <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: '#5b4fe8', boxShadow: '0 2px 6px rgba(91,79,232,0.4)' }} />
        <span style={{ position: 'absolute', left: `${pct}%`, top: -28, transform: 'translateX(-50%)', fontWeight: 700, fontSize: 'clamp(13px,3vw,20px)', color: '#5b4fe8', whiteSpace: 'nowrap' }}>{fmtN}</span>
        <span style={{ position: 'absolute', left: 0, bottom: -22, transform: 'translateX(-50%)', fontWeight: 600, fontSize: 'clamp(12px,2.5vw,17px)', whiteSpace: 'nowrap' }}>{fmtLo}</span>
        <span style={{ position: 'absolute', right: 0, bottom: -22, transform: 'translateX(50%)', fontWeight: 600, fontSize: 'clamp(12px,2.5vw,17px)', whiteSpace: 'nowrap' }}>{fmtHi}</span>
      </div>
    </div>
  )
}

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => makeLine(genClear())), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { fmtN: fN, fmtLo, fmtHi, lo_val, hi_val, correct_val, pct } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(v) {
    if (fb || done) return
    setFb({ v, ok: v === correct_val })
    setTimeout(() => { setFb(null); if (ri + 1 >= rounds.length) setDone(true); else setRi(i => i + 1) }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.5_2C.tip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.2C.whichCloser')}</div>
            <NumberLine pct={pct} fmtN={fN} fmtLo={fmtLo} fmtHi={fmtHi} />
            <div className="mission-bigger-row">
              {[[lo_val, fmtLo], [hi_val, fmtHi]].map(([v, label]) => (
                <button
                  key={v}
                  className={`mission-bigger-btn${fb ? v === correct_val ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(22px,4.5vw,36px)', width: 'clamp(80px,16vw,120px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{label}</button>
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

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 4 }, () => {
    const n_t = genAny()
    const correct = roundedN(n_t), wrong = (correct === loN(n_t) ? hiN(n_t) : loN(n_t))
    const claimed = Math.random() < 0.5 ? correct : wrong
    // "3.7 rounds to 4" — claimed is a whole number
    return { fmtN: fmtN(n_t), fmtClaimed: String(claimed), isTrue: claimed === correct }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { fmtN: fN, fmtClaimed, isTrue } = rounds[ri]

  function pick(chosen) {
    if (fb) return
    const ok = chosen === isTrue
    setFb({ chosen, ok })
    setTimeout(() => { setFb(null); if (ok) { if (ri + 1 >= rounds.length) onNext(); else setRi(i => i + 1) } }, 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.2B.trueOrFalse')}</div>
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(20px,4.5vw,34px)', fontWeight: 700, margin: '0.4rem 0 1rem', textAlign: 'center' }}>
          {fN} {t('mission.2C.roundsToWord')} {fmtClaimed}
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

function S3({ onNext }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, () => { const n = genAny(); return { n, answer: roundedN(n) } }), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)

  function submit(val) {
    const ok = parseInt(val) === qs[qi].answer
    setFb(ok ? 'correct' : 'wrong')
    if (ok) { setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onNext() : setQi(i => i + 1) }, 700) }
    else { setTimeout(() => setFb(null), 700) }
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_2C.roundToWhole')}</div>
        <div style={{ fontSize: 'clamp(26px,6vw,46px)', fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em', marginBottom: '0.5rem', color: fb === 'correct' ? '#2e7d32' : fb === 'wrong' ? '#c62828' : 'inherit' }}>
          {fmtN(qs[qi].n)}
        </div>
        <NumberPad key={qi} onSubmit={submit} allowDecimal={false} disabled={!!fb} />
        <RoundDots total={qs.length} current={qi} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => shuffle(HALFW_POOL).slice(0, 3).map(n => makeLine(n)), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { fmtN: fN, fmtLo, fmtHi, lo_val, hi_val, correct_val } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(v) {
    if (fb || done) return
    const ok = v === correct_val
    setFb({ v, ok })
    if (ok) {
      setTimeout(() => { setFb(null); if (ri + 1 >= rounds.length) setDone(true); else setRi(i => i + 1) }, 700)
    } else {
      setTimeout(() => setFb(null), 700)
    }
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">{t('mission.2C.halfwayTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.2C.halfwayTitle')}</div>
            <NumberLine pct={50} fmtN={fN} fmtLo={fmtLo} fmtHi={fmtHi} />
            <div className="mission-bigger-row">
              {[[lo_val, fmtLo], [hi_val, fmtHi]].map(([v, label]) => (
                <button
                  key={v}
                  className={`mission-bigger-btn${fb ? v === correct_val ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(22px,4.5vw,36px)', width: 'clamp(80px,16vw,120px)' }}
                  onClick={() => pick(v)}
                  disabled={!!fb}
                >{label}</button>
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

function S5({ onFinish }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 4 }, () => { const n = genAny(); return { n, answer: roundedN(n) } }), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)

  function submit(val) {
    const ok = parseInt(val) === qs[qi].answer
    setFb(ok ? 'correct' : 'wrong')
    if (ok) { setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700) }
    else { setTimeout(() => setFb(null), 700) }
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.5_2C.roundToWhole')}</div>
        <div style={{ fontSize: 'clamp(26px,6vw,46px)', fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em', marginBottom: '0.5rem', color: fb === 'correct' ? '#2e7d32' : fb === 'wrong' ? '#c62828' : 'inherit' }}>
          {fmtN(qs[qi].n)}
        </div>
        <NumberPad key={qi} onSubmit={submit} allowDecimal={false} disabled={!!fb} />
        <RoundDots total={qs.length} current={qi} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

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

export default function Mission5_2C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_2C' })
    setStep(5)
  }

  if (step === 0) return <S1 onNext={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 onFinish={finish} />
  return <Complete onDone={onComplete} />
}
