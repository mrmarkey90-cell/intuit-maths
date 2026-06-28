import { useState, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }

const BONDS = [[1,9],[2,8],[3,7],[4,6],[5,5]]

function BondList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ fontSize: 'clamp(52px,13vw,88px)', fontWeight: 900, color: '#5b4fe8', lineHeight: 1, marginBottom: '0.4rem' }}>10</div>
      {BONDS.map(([a, b], i) => (
        <div key={i} className="bond-list-item" style={{ animationDelay: `${i * 0.18}s` }}>
          {a} + {b}
        </div>
      ))}
    </div>
  )
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

// ── S0: Ten-frame fill (warm-up) ──────────────────────────────────────────────
// Pre-fill N cells; player taps the rest to complete 10

const TF_STARTS = [3, 5, 7]

function TenFrameFill({ onDone }) {
  const { t } = useTranslation()
  const [ri, setRi] = useState(0)
  const [cells, setCells] = useState(() =>
    Array(10).fill(null).map((_, i) => i < TF_STARTS[0] ? 'pre' : null)
  )
  const [showEq, setShowEq] = useState(false)
  const n = TF_STARTS[ri]

  function tapCell(i) {
    if (cells[i] || showEq) return
    const next = [...cells]
    next[i] = 'player'
    setCells(next)
    if (next.every(Boolean)) setTimeout(() => setShowEq(true), 300)
  }

  function nextRound() {
    const nr = ri + 1
    if (nr >= TF_STARTS.length) { onDone(); return }
    setRi(nr)
    setCells(Array(10).fill(null).map((_, i) => i < TF_STARTS[nr] ? 'pre' : null))
    setShowEq(false)
  }

  return (
    <div className="mission-screen">
      <div className="mission-body">
        <div className="mission-title">{t('mission.3A.fillFrame')}</div>
        <div className="ten-frame">
          {cells.map((s, i) => (
            <div
              key={i}
              className={`tf-cell${s === 'pre' ? ' tf-cell--pre' : s === 'player' ? ' tf-cell--player' : ' tf-cell--empty'}`}
              onClick={() => tapCell(i)}
            />
          ))}
        </div>
        {showEq && (
          <div className="mission-title" style={{ color: '#5b4fe8', marginTop: '0.6rem' }}>
            {n} + {10 - n} = 10 ✓
          </div>
        )}
        <RoundDots total={TF_STARTS.length} current={ri} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={nextRound} style={{ visibility: showEq ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
    </div>
  )
}

// ── S1: Pair-select — tap two numbers from 5 that add to 10 ──────────────────

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
      <Progress step={5} />
      <div className="mission-body">
        {done ? (
          <BondList />
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

// ── S2: Drag individual dots into gap — "[N dots] + ___ = 10" ────────────────

function BondDots({ n }) {
  return (
    <div className="bond-drag-dots">
      {Array.from({ length: n }, (_, i) => <span key={i} className="bond-drag-dot" />)}
    </div>
  )
}

function genDotDragRounds() {
  return shuffle([[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]]).slice(0, 3).map(([a, b]) => ({ question: a, correct: b }))
}

function S2({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genDotDragRounds(), [])
  const [ri, setRi] = useState(0)
  const [count, setCount] = useState(0)
  const [drag, setDrag] = useState(null)
  const slotRef = useRef(null)

  const { question, correct } = rounds[ri]
  const done = count === correct

  function startDrag(e) {
    if (done) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ x: e.clientX, y: e.clientY })
  }
  function onMove(e) {
    if (!drag) return
    setDrag({ x: e.clientX, y: e.clientY })
  }
  function onUp(e) {
    if (!drag) return
    const r = slotRef.current?.getBoundingClientRect()
    if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      setCount(c => Math.min(c + 1, correct))
    }
    setDrag(null)
  }

  function advance() {
    const next = ri + 1
    if (next >= rounds.length) { onNext(); return }
    setRi(next)
    setCount(0)
  }

  const poolCount = correct - count

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <div className="mission-body">
        <div className="mission-title">{t('mission.3A.dragToMake10')}</div>
        <div className={`bond-drag-eq${done ? ' bond-drag-eq--done' : ''}`}>
          <div className="bond-drag-tile">
            <BondDots n={question} />
          </div>
          <span className="bond-drag-op">+</span>
          <div className="bond-drag-slot-col">
            <span className="bond-drag-counter" style={{ visibility: count > 0 ? 'visible' : 'hidden' }}>
              {count}
            </span>
            <div ref={slotRef} className="bond-drag-tile bond-drag-tile--slot">
              {count > 0 ? <BondDots n={count} /> : <span className="bond-drag-slot-hint">?</span>}
            </div>
          </div>
          <span className="bond-drag-op">= 10</span>
        </div>
        <div className="bond-drag-pool">
          {Array.from({ length: poolCount }, (_, i) => (
            <div key={i}
              className="bond-drag-pool-dot"
              style={{ visibility: drag && i === poolCount - 1 ? 'hidden' : 'visible' }}
              onPointerDown={startDrag}
              onPointerMove={onMove}
              onPointerUp={onUp}
            />
          ))}
        </div>
        <RoundDots total={rounds.length} current={ri} />
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={advance}
          style={{ visibility: done ? 'visible' : 'hidden' }}>
          {t('mission.next')}
        </button>
      </div>
      {drag && <div className="bond-drag-ghost-dot" style={{ left: drag.x, top: drag.y }} />}
    </div>
  )
}

// ── S3: True or false — "N + M = 10?" ────────────────────────────────────────

function genTF3A(count) {
  return Array.from({ length: count }, () => {
    const isTrue = Math.random() < 0.5
    let a, b
    if (isTrue) { a = rnd(1, 9); b = 10 - a }
    else {
      do { a = rnd(1, 9); b = rnd(1, 9) } while (a + b === 10)
    }
    return { a, b, isTrue }
  })
}

function S3({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genTF3A(4), [])
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
      <Progress step={2} />
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

// ── S4: Partner pick — see N, tap its bond partner ────────────────────────────

function genPartnerRounds(count) {
  return Array.from({ length: count }, () => {
    const n = rnd(1, 9)
    const correct = 10 - n
    const opts = new Set([correct])
    while (opts.size < 4) { const d = rnd(1, 9); if (d !== correct) opts.add(d) }
    return { n, opts: shuffle([...opts]) }
  })
}

function S4({ onNext }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => genPartnerRounds(5), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const [done, setDone] = useState(false)
  const { n, opts } = rounds[Math.min(ri, rounds.length - 1)]
  const correct = 10 - n

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
          <div className="mission-title">{t('mission.3A.bondTip')}</div>
        ) : (
          <>
            <div style={{ fontSize: 'clamp(56px,13vw,96px)', fontWeight: 900, textAlign: 'center', color: '#1f2937', lineHeight: 1 }}>{n}</div>
            <div className="mission-subtitle" style={{ marginTop: '0.4rem' }}>{t('mission.3A.partnerOf')}</div>
            <div className="mission-bigger-row">
              {opts.map(opt => (
                <button
                  key={opt}
                  className={`mission-bigger-btn${fb ? opt === correct ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
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

// ── S5: Odd one out — 4 form two bond pairs, 1 has no partner shown ───────────

const BOND_PAIRS = [[1,9],[2,8],[3,7],[4,6]]  // exclude [5,5] (same number twice)

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
      <Progress step={4} />
      <div className="mission-body">
        {done ? (
          <BondList />
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

export default function Mission1_3A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_3A' })
    setStep(6)
  }

  if (step === 0) return <TenFrameFill onDone={() => setStep(1)} />
  if (step === 1) return <S2 onNext={() => setStep(2)} />
  if (step === 2) return <S3 onNext={() => setStep(3)} />
  if (step === 3) return <S4 onNext={() => setStep(4)} />
  if (step === 4) return <S5 onFinish={() => setStep(5)} />
  if (step === 5) return <S1 onNext={finish} />
  return <Complete onDone={onComplete} />
}
