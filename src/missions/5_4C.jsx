import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

// Both 3-digit; at least one column requires borrowing.
function genQ() {
  let a, b
  do {
    a = rnd(100, 999)
    b = rnd(100, a - 1)
  } while (!((a % 10) < (b % 10) || (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10)))
  return { a, b, diff: a - b }
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

function ColSub({ a, b }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
      <div className="insight-column-inner">
        <div className="insight-column-row">
          <span className="insight-column-operator" />
          <span className="insight-column-number">{a}</span>
        </div>
        <div className="insight-column-row">
          <span className="insight-column-operator">−</span>
          <span className="insight-column-number">{b}</span>
        </div>
        <div className="insight-column-rule" />
      </div>
    </div>
  )
}

function colStr(a, b) {
  const w = Math.max(String(a).length, String(b).length)
  return `  ${String(a).padStart(w)}\n− ${String(b).padStart(w)}\n${'─'.repeat(w + 2)}`
}

// ── S0: Mini-game — borrow radar (does units column need to borrow?) ──────────
// 5 rounds with a mix of borrow/no-borrow cases.

function genBorrowRound() {
  const top = rnd(0, 9)
  const bottom = rnd(0, 9)
  return { top, bottom, needsBorrow: top < bottom }
}

function MiniGame({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const borrowRounds = Array.from({ length: 3 }, () => {
      let r
      do { r = genBorrowRound() } while (!r.needsBorrow)
      return r
    })
    const noborrowRounds = Array.from({ length: 2 }, () => {
      let r
      do { r = genBorrowRound() } while (r.needsBorrow)
      return r
    })
    return shuffle([...borrowRounds, ...noborrowRounds])
  }, [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { top, bottom, needsBorrow } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(v) {
    if (fb) return
    const ok = v === needsBorrow
    setFb({ v, ok })
    setTimeout(() => {
      setFb(null)
      if (ok) { if (ri + 1 >= rounds.length) onDone(); else setRi(r => r + 1) }
    }, 700)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.4C.borrowTitle')}</div>
        <div style={{ fontFamily: 'monospace', textAlign: 'center', margin: '0.6rem 0 1rem', lineHeight: 1.2 }}>
          <div style={{ fontSize: 'clamp(48px,12vw,80px)', fontWeight: 900 }}>{top}</div>
          <div style={{ fontSize: 'clamp(28px,7vw,48px)', fontWeight: 700, color: '#64748b' }}>−{bottom}</div>
          <div style={{ borderTop: '3px solid #64748b', width: 80, margin: '4px auto 0' }} />
        </div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button key={String(v)}
              className={`mission-bigger-btn${fb ? v === needsBorrow ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(14px,3vw,22px)', width: 'clamp(110px,22vw,160px)' }}
              onClick={() => pick(v)} disabled={!!fb}>
              {v ? t('mission.4C.yesBorrow') : t('mission.4C.noBorrow')}
            </button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
    </div>
  )
}

// ── S1: What is the answer? ───────────────────────────────────────────────────

function S1({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, () => {
    const { a, b, diff } = genQ()
    const opts = new Set([diff])
    for (const off of shuffle([-1, 1, -10, 10, -100, 100])) {
      if (opts.size >= 4) break
      const v = diff + off
      if (v > 0 && v !== diff) opts.add(v)
    }
    return { a, b, diff, opts: shuffle([...opts]) }
  }), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, diff, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb || done) return
    setFb({ opt, ok: opt === diff })
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
          <div className="mission-title">{t('mission.4C.borrowTip')}</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4C.pickAnswer')}</div>
            <ColSub a={a} b={b} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(300px,62vw)' }}>
              {opts.map(opt => (
                <button key={opt}
                  className={`mission-bigger-btn${fb ? opt === diff ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  style={{ fontSize: 'clamp(14px,3vw,20px)' }}
                  onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
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

// ── S2: True or false? ────────────────────────────────────────────────────────

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => {
    const trues = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      return { a, b, shown: diff, isTrue: true }
    })
    const falses = Array.from({ length: 2 }, () => {
      const { a, b, diff } = genQ()
      const off = shuffle([-1, 1, -10, 10, -100, 100])[0]
      const s = diff + off
      return { a, b, shown: s > 0 ? s : diff + 1, isTrue: false }
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
        <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.8rem 1.4rem', fontSize: 'clamp(20px,5vw,36px)', fontWeight: 700, textAlign: 'center', margin: '0.4rem 0 1rem' }}>
          {a} − {b} = {shown}
        </div>
        <div className="mission-bigger-row">
          {[true, false].map(v => (
            <button key={String(v)}
              className={`mission-bigger-btn${fb ? v === isTrue ? ' mission-bigger-btn--correct' : v === fb.v && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              style={{ fontSize: 'clamp(16px,3.5vw,26px)', width: 'clamp(90px,18vw,140px)' }}
              onClick={() => pick(v)} disabled={!!fb}>
              {v ? t('mission.2B.trueBtn') : t('mission.2B.falseBtn')}
            </button>
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── S3: Fix the missing digit in the answer ───────────────────────────────────

function genFixRound() {
  const { a, b, diff } = genQ()
  const str = String(diff)
  const pos = rnd(0, str.length - 1)
  const correct = parseInt(str[pos], 10)
  const opts = new Set([correct])
  while (opts.size < 4) { const d = rnd(0, 9); if (d !== correct) opts.add(d) }
  const display = str.slice(0, pos) + '?' + str.slice(pos + 1)
  return { a, b, display, correct, opts: shuffle([...opts]) }
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genFixRound), [])
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
            <div className="mission-subtitle">{t('mission.4C.fixDigit')}</div>
            <div style={{ background: '#f0f2ff', borderRadius: 12, padding: '0.6rem 1.2rem', fontSize: 'clamp(18px,4.5vw,32px)', fontWeight: 700, textAlign: 'center', margin: '0.3rem 0 0.8rem' }}>
              {a} − {b} = <span style={{ color: '#4f46e5', fontSize: 'clamp(22px,5.5vw,38px)' }}>{display}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: 'min(240px,50vw)', marginTop: '0.4rem' }}>
              {opts.map(opt => (
                <button key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
                  onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
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

// ── S4: Which has the bigger answer? ─────────────────────────────────────────

function genCompRound() {
  let q1, q2
  do { q1 = genQ(); q2 = genQ() } while (q1.diff === q2.diff)
  return { q1, q2, biggerIdx: q1.diff > q2.diff ? 0 : 1 }
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genCompRound), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { q1, q2, biggerIdx } = rounds[Math.min(ri, rounds.length - 1)]

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
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <div className="mission-title">✓</div>
        ) : (
          <>
            <div className="mission-subtitle">{t('mission.4C.whichBigger')}</div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', margin: '0.5rem 0 1rem' }}>
              {[q1, q2].map(({ a, b }, idx) => {
                const isSel = fb && fb.idx === idx
                const cls = isSel ? (fb.ok ? ' mission-bigger-btn--correct' : ' mission-bigger-btn--wrong') : ''
                return (
                  <button key={idx} className={`mission-bigger-btn${cls}`}
                    style={{ flex: 1, maxWidth: 'clamp(130px,30vw,180px)', fontFamily: 'monospace', fontSize: 'clamp(13px,2.8vw,18px)', whiteSpace: 'pre', lineHeight: 1.5, padding: '0.5rem 0.4rem' }}
                    onClick={() => pick(idx)} disabled={!!fb}>
                    {colStr(a, b)}
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

// ── S5: NumPad ────────────────────────────────────────────────────────────────

function S5({ onFinish }) {
  const qs = useMemo(() => Array.from({ length: 4 }, genQ), [])
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const { a, b, diff } = qs[qi]

  function submit(val) {
    if (fb) return
    const ok = parseInt(val, 10) === diff
    setFb(ok ? 'correct' : 'wrong')
    if (ok) setTimeout(() => { setFb(null); qi + 1 >= qs.length ? onFinish() : setQi(i => i + 1) }, 700)
    else setTimeout(() => setFb(null), 700)
  }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <ColSub a={a} b={b} />
        <RoundDots total={qs.length} current={qi} />
        <NumberPad key={qi} onSubmit={submit} disabled={!!fb} />
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

export default function Mission5_4C({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '5_4C' })
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
