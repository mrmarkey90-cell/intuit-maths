import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import NumberPad from '../components/NumberPad'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function factorsOf(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }

function commonFactors(a, b) {
  return factorsOf(a).filter(v => v > 1 && b % v === 0)
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
        <span key={i} className={`mission-round-dot${i < current ? ' mission-round-dot--done' : i === current ? ' mission-round-dot--active' : ''}`} />
      ))}
    </div>
  )
}

function PairChips({ a, b }) {
  return (
    <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 14px)', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{a}</span>
      <span style={{ color: '#6b7280', fontSize: 'clamp(14px, 2.5vw, 20px)' }}>&</span>
      <span className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(18px, 3.5vw, 28px)' }}>{b}</span>
    </div>
  )
}

// ── Screen 1: Find all factors of N (warm-up, 6-tile) ────────────────────────

function genFactorQ(min, max, excludeN = null) {
  let n, factors
  do {
    n = rnd(min, max)
    factors = factorsOf(n)
  } while (factors.length < 3 || factors.length > 5 || n === excludeN)
  const nonFactors = []
  for (let i = 2; i <= n + 2; i++) if (n % i !== 0) nonFactors.push(i)
  const distractors = shuffle(nonFactors).slice(0, 6 - factors.length)
  const values = shuffle([...factors, ...distractors])
  return { n, values }
}

function FactorMultiQ({ q, onComplete }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set([1]))
  const [submitted, setSubmitted] = useState(false)
  const correctSet = new Set(q.values.filter(v => q.n % v === 0))

  function toggle(v) {
    if (submitted || v === 1) return
    setSelected(s => { const ns = new Set(s); if (ns.has(v)) ns.delete(v); else ns.add(v); return ns })
  }
  function check() {
    const allCorrect = [...correctSet].every(v => selected.has(v)) && [...selected].every(v => correctSet.has(v))
    setSubmitted(true)
    setTimeout(() => onComplete(allCorrect), 1000)
  }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!correctSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (correctSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '380px' }}>
      <div className="mission-subtitle">{t('mission.1G.findAll')}{q.n}</div>
      <div className="mission-eo-grid">
        {q.values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={selected.size === 0 || submitted}>✓</button>
    </div>
  )
}

function S1FactorWarmup({ onNext }) {
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(() => genFactorQ(8, 15))
  const [roundKey, setRoundKey] = useState(0)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { onNext(); return }
    if (correct) setCount(c => c + 1)
    setQ(prev => genFactorQ(8, 15, prev.n))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <FactorMultiQ key={roundKey} q={q} onComplete={advance} />
        <RoundDots total={TOTAL} current={count} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" style={{ visibility: 'hidden' }}>_</button>
      </div>
    </div>
  )
}

// ── Screen 2: Teach — side-by-side factor lists, common highlighted ───────────

function genTeachPair() {
  let a, b, common
  do {
    const shared = rnd(2, 6)
    a = shared * rnd(2, 4)
    b = shared * rnd(2, 4)
    common = commonFactors(a, b)
  } while (a === b || a > 30 || b > 30 || common.length === 0)
  return { a, b, common: new Set(common) }
}

function S2Teach({ onNext }) {
  const { t } = useTranslation()
  const { a, b, common } = useMemo(genTeachPair, [])
  const factA = useMemo(() => factorsOf(a), [a])
  const factB = useMemo(() => factorsOf(b), [b])
  const [phase, setPhase] = useState(0)

  function advance() {
    if (phase < 3) setPhase(p => p + 1)
    else onNext()
  }

  function chipCls(v, isCommon) {
    if (phase < 3) return 'mission-multiples-chip' + (phase >= 2 ? ' mission-multiples-chip--lit' : '')
    return isCommon
      ? 'mission-multiples-chip mission-multiples-chip--lit'
      : 'mission-multiples-chip'
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <div className="mission-body">
        <div className="mission-subtitle">
          {phase === 0 && t('mission.6_1G.commonOf') + a + t('mission.6_1G.and') + b}
          {phase === 1 && `${t('mission.1G.factorsOf')}${a}:`}
          {phase === 2 && `${t('mission.1G.factorsOf')}${b}:`}
          {phase === 3 && t('mission.6_1G.appear')}
        </div>

        {phase >= 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vw, 14px)', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', fontWeight: 700, color: '#4f46e5', minWidth: '3em' }}>{a}:</span>
              {factA.map(v => (
                <span key={v} className={chipCls(v, common.has(v))} style={{ fontSize: 'clamp(13px, 2.2vw, 18px)' }}>{v}</span>
              ))}
            </div>
            {phase >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: 'clamp(13px, 2.2vw, 18px)', fontWeight: 700, color: '#4f46e5', minWidth: '3em' }}>{b}:</span>
                {factB.map(v => (
                  <span key={v} className={chipCls(v, common.has(v))} style={{ fontSize: 'clamp(13px, 2.2vw, 18px)' }}>{v}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 3 && (
          <div style={{ display: 'flex', gap: 'clamp(4px, 0.8vw, 8px)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'clamp(4px, 0.8vw, 8px)' }}>
            {[...common].sort((x, y) => x - y).map(v => (
              <span key={v} className="mission-multiples-chip mission-multiples-chip--lit" style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}>{v}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={advance}>
          {phase < 3 ? t('mission.anotherExample') : t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: "Is this a common factor?" Yes / No ────────────────────────────

function genIsCommonQ(excludeA = null) {
  let a, b, cf
  do {
    const shared = rnd(2, 8)
    a = shared * rnd(2, 5)
    b = shared * rnd(2, 5)
    cf = commonFactors(a, b)
  } while (a === b || a > 50 || b > 50 || cf.length === 0 || a === excludeA)
  if (Math.random() < 0.5) {
    return { a, b, n: pick(cf), isCommon: true }
  }
  const nonCommon = [
    ...factorsOf(a).filter(v => v > 1 && b % v !== 0),
    ...factorsOf(b).filter(v => v > 1 && a % v !== 0),
  ]
  if (nonCommon.length === 0) return { a, b, n: pick(cf), isCommon: true }
  return { a, b, n: pick(nonCommon), isCommon: false }
}

function S3IsCommonFactor({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genIsCommonQ)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { a, b, n, isCommon } = q

  function choose(yes) {
    if (fb || done) return
    const correct = yes === isCommon
    setFb({ yes, correct })
    setTimeout(() => {
      setFb(null)
      if (correct && count + 1 >= TOTAL) {
        setDone(true)
      } else {
        if (correct) setCount(c => c + 1)
        setQ(prev => genIsCommonQ(prev.a))
      }
    }, 700)
  }

  function btnCls(yes) {
    if (!fb) return 'mission-bigger-btn'
    if (yes === isCommon) return 'mission-bigger-btn mission-bigger-btn--correct'
    if (fb.yes === yes) return 'mission-bigger-btn mission-bigger-btn--wrong'
    return 'mission-bigger-btn'
  }

  return (
    <div className="mission-screen">
      <Progress step={3} />
      <div className="mission-body">
        <div style={{ visibility: done ? 'hidden' : 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.8vw, 8px)' }}>
          <PairChips a={a} b={b} />
          <div className="mission-title" style={{ fontSize: 'clamp(36px, 8vw, 60px)', margin: 0 }}>{n}</div>
        </div>
        <div className="mission-subtitle">
          {done ? t('mission.6_1G.great') : t('mission.6_1G.isItCommon')}
        </div>
        <div className="mission-bigger-row" style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <button className={btnCls(true)} onClick={() => choose(true)} disabled={!!fb}>
            {t('mission.1G.yesBtn')}
          </button>
          <button className={btnCls(false)} onClick={() => choose(false)} disabled={!!fb}>
            {t('mission.1G.noBtn')}
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

// ── Screen 4: Tap all common factors ─────────────────────────────────────────

function genMultiCommonQ(excludeA = null) {
  let a, b, cf
  do {
    const shared = rnd(2, 8)
    a = shared * rnd(2, 5)
    b = shared * rnd(2, 5)
    cf = commonFactors(a, b)
  } while (a === b || a > 50 || b > 50 || cf.length < 2 || cf.length > 4 || a === excludeA)
  const nonCommon = shuffle([
    ...factorsOf(a).filter(v => v > 1 && b % v !== 0),
    ...factorsOf(b).filter(v => v > 1 && a % v !== 0),
  ]).slice(0, 6 - cf.length)
  const values = shuffle([...cf, ...nonCommon])
  return { a, b, cfSet: new Set(cf), values }
}

function MultiCommonQ({ a, b, cfSet, values, onComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggle(v) {
    if (submitted) return
    setSelected(s => { const ns = new Set(s); if (ns.has(v)) ns.delete(v); else ns.add(v); return ns })
  }
  function check() {
    const allCorrect = [...cfSet].every(v => selected.has(v)) && [...selected].every(v => cfSet.has(v))
    setSubmitted(true)
    setTimeout(() => onComplete(allCorrect), 1000)
  }
  function tileCls(v) {
    if (!submitted) return `mission-eo-tile${selected.has(v) ? ' mission-eo-tile--selected' : ''}`
    if (cfSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--correct'
    if (!cfSet.has(v) && selected.has(v)) return 'mission-eo-tile mission-eo-tile--wrong'
    if (cfSet.has(v) && !selected.has(v)) return 'mission-eo-tile mission-eo-tile--missed'
    return 'mission-eo-tile'
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vw, 12px)', width: '100%', maxWidth: '380px' }}>
      <PairChips a={a} b={b} />
      <div className="mission-eo-grid">
        {values.map(v => (
          <button key={v} className={tileCls(v)} onClick={() => toggle(v)} disabled={submitted}>{v}</button>
        ))}
      </div>
      <button className="mission-next-btn" style={{ width: '100%' }} onClick={check} disabled={submitted}>✓</button>
    </div>
  )
}

function S4MultiCommonFactor({ onNext }) {
  const { t } = useTranslation()
  const TOTAL = 3
  const [count, setCount] = useState(0)
  const [q, setQ] = useState(genMultiCommonQ)
  const [roundKey, setRoundKey] = useState(0)
  const [done, setDone] = useState(false)

  function advance(correct) {
    if (correct && count + 1 >= TOTAL) { setDone(true); return }
    if (correct) setCount(c => c + 1)
    setQ(prev => genMultiCommonQ(prev.a))
    setRoundKey(k => k + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={4} />
      <div className="mission-body">
        <div className="mission-title">
          {done ? t('mission.6_1G.great') : t('mission.6_1G.tapAllCommon')}
        </div>
        <div style={{ visibility: done ? 'hidden' : 'visible', pointerEvents: done ? 'none' : 'auto' }}>
          <MultiCommonQ key={roundKey} {...q} onComplete={advance} />
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

// ── Screen 5: Numpad — write a common factor (test) ──────────────────────────

function genNumpadQ() {
  let a, b, cf
  do {
    const shared = rnd(2, 10)
    a = shared * rnd(2, 5)
    b = shared * rnd(2, 5)
    cf = commonFactors(a, b)
  } while (a === b || a > 50 || b > 50 || cf.length === 0)
  return { a, b, cf }
}

function NumpadQ({ q, onComplete }) {
  const [wrongVal, setWrongVal] = useState(null)
  const [correct, setCorrect] = useState(false)
  const [padKey, setPadKey] = useState(0)

  function submit(input) {
    if (correct || wrongVal !== null) return
    const v = parseInt(input, 10)
    if (q.cf.includes(v)) {
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
      <PairChips a={q.a} b={q.b} />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className={boxCls()}>{correct ? '✓' : wrongVal !== null ? wrongVal : '?'}</div>
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
        <div className="mission-subtitle">{t('mission.6_1G.writeCommon')}</div>
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
        <div className="mission-complete-icon">🔗</div>
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

export default function Mission6_1G({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '6_1G' })
    setStep(5)
  }

  if (step === 0) return <S1FactorWarmup onNext={() => setStep(1)} />
  if (step === 1) return <S2Teach onNext={() => setStep(2)} />
  if (step === 2) return <S3IsCommonFactor onNext={() => setStep(3)} />
  if (step === 3) return <S4MultiCommonFactor onNext={() => setStep(4)} />
  if (step === 4) return <S5Numpad onFinish={finish} />
  return <Complete onDone={onComplete} />
}
