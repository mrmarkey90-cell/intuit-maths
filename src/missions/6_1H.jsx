import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function isPrime(n) { if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false; return true }

const PRIMES_TO_30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

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
        <span key={i} className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`} />
      ))}
    </div>
  )
}

// ── Screen 1: "Is this prime?" Yes / No (range 2–30) ─────────────────────────

function genIsPrimeQ() {
  const n = rnd(2, 30)
  return { n, prime: isPrime(n) }
}

function S1IsPrime({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 4
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genIsPrimeQ)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { n, prime } = q

  function choose(yes) {
    if (fb || done) return
    const correct = yes === prime
    setFb({ yes, correct })
    setTimeout(() => {
      setFb(null)
      if (correct && count + 1 >= TOTAL) {
        setDone(true)
      } else {
        if (correct) setCount(c => c + 1)
        setQ(genIsPrimeQ())
      }
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === prime) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title" style={{ visibility: done ? 'hidden' : 'visible', fontSize: 'clamp(44px, 10vw, 72px)' }}>
          {n}
        </div>
        <div className="mission-title">
          {done ? t('mission.6_1H.great') : t('mission.1H.isPrime')}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <button className={btnCls(true)} style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }} onClick={() => choose(true)} disabled={!!fb}>
            {t('mission.1H.yesBtn')}
          </button>
          <button className={btnCls(false)} style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }} onClick={() => choose(false)} disabled={!!fb}>
            {t('mission.1H.noBtn')}
          </button>
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 2: Teach — primes to 30 appearing one by one ──────────────────────

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = PRIMES_TO_30.map((_, i) => setTimeout(() => setRevealed(i + 1), 400 + i * 350))
    return () => timers.forEach(clearTimeout)
  }, [])

  const done = revealed >= PRIMES_TO_30.length

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.1H.primesUpTo')}</div>
        <div className="mission-multiples-strip">
          {[PRIMES_TO_30.slice(0, 5), PRIMES_TO_30.slice(5)].map((row, rowIdx) => (
            <div key={rowIdx} className="mission-multiples-row">
              {row.map((p, colIdx) => {
                const gi = rowIdx * 5 + colIdx
                return (
                  <span key={p} className={`mission-multiples-chip${gi < revealed ? ' mission-multiples-chip--lit' : ''}`}>{p}</span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: What is the next prime after N? (circle 4 options) ──────────────

function genNextPrimeQ() {
  const idx = Math.floor(Math.random() * (PRIMES_TO_30.length - 1))
  const n = PRIMES_TO_30[idx]
  const answer = PRIMES_TO_30[idx + 1]
  const wrong = shuffle([answer + 1, answer + 2, answer - 1, PRIMES_TO_30[idx - 1] ?? answer + 4]
    .filter(x => x > 0 && x !== answer && x !== n))
    .slice(0, 3)
  return { n, answer, options: shuffle([answer, ...wrong]).slice(0, 4) }
}

function CircleRound({ n, answer, options, prompt, onComplete }) {
  const [picked, setPicked] = useState(null)
  function choose(v) {
    if (picked !== null) return
    setPicked(v)
    setTimeout(() => onComplete(v === answer), 700)
  }
  function cls(v) {
    if (picked === null) return 'mission-spot-btn'
    if (v === answer) return 'mission-spot-btn mission-spot-btn--correct'
    if (v === picked) return 'mission-spot-btn mission-spot-btn--wrong'
    return 'mission-spot-btn'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
      <div className="mission-title" style={{ fontSize: 'clamp(40px, 9vw, 68px)', margin: 0 }}>{n}</div>
      <div className="mission-spot-grid">
        {options.map(v => (
          <button key={v} className={cls(v)} onClick={() => choose(v)} disabled={picked !== null}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function S3NextPrime({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genNextPrimeQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genNextPrimeQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {done ? t('mission.6_1H.great') : t('mission.6_1H.nextPrimeAfter')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <CircleRound key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 4: Largest prime below N (circle 4 options) ───────────────────────

function genLargestBelowQ() {
  const n = rnd(12, 30)
  let answer = n - 1
  while (!isPrime(answer)) answer--
  const wrong = shuffle([answer - 2, answer - 4, answer + 1, answer - 6]
    .filter(x => x > 1 && x !== answer))
    .slice(0, 3)
  return { n, answer, options: shuffle([answer, ...wrong]).slice(0, 4) }
}

function S4LargestBelow({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genLargestBelowQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(genLargestBelowQ())
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {done ? t('mission.6_1H.great') : t('mission.6_1H.largestBelow')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <CircleRound key={roundKey} {...q} onComplete={advance} />
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible' }}>
          <RoundDots total={TOTAL} current={count} />
        </div>
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={onNext} style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 5: Numpad — type the largest prime below N (test) ─────────────────

function genNumpadQ() {
  const n = rnd(12, 30)
  let answer = n - 1
  while (!isPrime(answer)) answer--
  return { n, answer }
}

function NumpadQ({ q, onComplete }) {
  const { t } = useTranslation()
  const [wrongVal, setWrongVal] = useState(null)
  const [correct, setCorrect] = useState(false)
  const [padKey, setPadKey] = useState(0)

  function submit(input) {
    if (correct || wrongVal !== null) return
    if (parseInt(input, 10) === q.answer) {
      setCorrect(true)
      setTimeout(onComplete, 800)
    } else {
      setWrongVal(input)
      setTimeout(() => { setWrongVal(null); setPadKey(k => k + 1) }, 700)
    }
  }

  function boxCls() {
    if (correct) return 'mission-gap-box mission-gap-box--wide mission-gap-box--correct'
    if (wrongVal !== null) return 'mission-gap-box mission-gap-box--wide mission-gap-box--wrong'
    return 'mission-gap-box mission-gap-box--wide mission-gap-box--active'
  }

  return (
    <>
      <div className="mission-title" style={{ fontSize: 'clamp(36px, 8vw, 60px)', margin: 0 }}>
        {t('mission.6_1H.largestBelow')}{q.n}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className={boxCls()}>{correct ? q.answer : wrongVal !== null ? wrongVal : '?'}</div>
      </div>
      <NumberPad key={padKey} onSubmit={submit} stage={1} disabled={correct || wrongVal !== null} />
    </>
  )
}

function S5Numpad({ onFinish }) {
  const { t } = useTranslation()
  const qs = useMemo(() => Array.from({ length: 3 }, genNumpadQ), [])
  const [idx, setIdx] = useState(0)
  const q = qs[idx]
  function advance() { if (idx + 1 >= qs.length) onFinish(); else setIdx(i => i + 1) }

  return (
    <div className="mission-screen">
      <Progress step={5} />
      <div className="mission-body">
        <NumpadQ key={idx} q={q} onComplete={advance} />
        <RoundDots total={qs.length} current={idx} />
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
        <div className="mission-complete-icon">⭐</div>
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

export default function Mission6_1H({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_1H' })
    setStep(5)
  }

  if (step === 0) return <S1IsPrime onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3NextPrime onNext={() => setStep(3)} />
  if (step === 3) return <S4LargestBelow onNext={() => setStep(4)} />
  if (step === 4) return <S5Numpad onFinish={finish} />
  return <Complete onDone={onComplete} />
}
