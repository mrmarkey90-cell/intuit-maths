import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)) }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

const SWEET = '🍬'

// Fixed tiny jitter so the pile looks naturally scattered rather than in a row
const JITTER = [[-3,2],[4,-4],[0,4],[-5,-1],[5,2],[-1,5],[3,-3],[-4,4],[2,2]]

function SweetPile({ count }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 'clamp(160px,40vw,260px)' }}>
      {Array.from({ length: count }, (_, i) => {
        const [dx, dy] = JITTER[i % JITTER.length]
        return (
          <span key={i} style={{ fontSize: 'clamp(26px,6vw,38px)', display: 'inline-block', transform: `translate(${dx}px,${dy}px)` }}>
            {SWEET}
          </span>
        )
      })}
    </div>
  )
}

function Progress({ step }) {
  return (
    <div className="mission-progress">
      <div className="mission-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
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

// ── Warm-up: "How many sweets?" ──────────────────────────────────────────────

function genWarmUp() {
  const count = rnd(2, 6)
  const opts = new Set([count])
  for (const off of shuffle([-2, -1, 1, 2, -3, 3])) {
    if (opts.size >= 4) break
    const v = count + off
    if (v >= 1 && v <= 9) opts.add(v)
  }
  while (opts.size < 4) { const v = rnd(1, 9); if (!opts.has(v)) opts.add(v) }
  return { count, opts: shuffle([...opts]) }
}

function Intro({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genWarmUp), [])
  const [ri, setRi] = useState(0)
  const [fb, setFb] = useState(null)
  const { count, opts } = rounds[Math.min(ri, rounds.length - 1)]

  function pick(opt) {
    if (fb) return
    setFb({ opt, ok: opt === count })
    setTimeout(() => {
      setFb(null)
      if (ri + 1 >= rounds.length) onDone()
      else setRi(r => r + 1)
    }, 700)
  }

  return (
    <div className="mission-screen">
      <RoundDots total={rounds.length} current={ri} />
      <div className="mission-body">
        <div className="mission-title">{t('mission.6A.howMany')}</div>
        <SweetPile count={count} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, clamp(72px,16vw,120px))', gap: '0.6rem', marginTop: '0.6rem' }}>
          {opts.map(opt => (
            <button key={opt}
              className={`mission-bigger-btn${fb ? opt === count ? ' mission-bigger-btn--correct' : opt === fb.opt && !fb.ok ? ' mission-bigger-btn--wrong' : '' : ''}`}
              onClick={() => pick(opt)} disabled={!!fb}>{opt}</button>
          ))}
        </div>
      </div>
      <div className="mission-actions" />
    </div>
  )
}

// ── Demo: sweets shared one-by-one into boxes ─────────────────────────────────

function genDemo() {
  const boxes = rnd(2, 3)
  const each = rnd(1, Math.floor(8 / boxes))
  return { boxes, each, total: boxes * each }
}

function Demo({ onDone }) {
  const { t } = useTranslation()
  const examples = useMemo(() => Array.from({ length: 3 }, genDemo), [])
  const [ei, setEi] = useState(0)
  const [placed, setPlaced] = useState([])   // placed[i] = box index for sweet i
  const [popBox, setPopBox] = useState(null) // box currently "popping"
  const [animDone, setAnimDone] = useState(false)
  const counterRef = useRef(0)

  const { boxes, each, total } = examples[ei]

  useEffect(() => {
    counterRef.current = 0
    setPlaced([])
    setPopBox(null)
    setAnimDone(false)

    const id = setInterval(() => {
      const idx = counterRef.current
      if (idx >= total) {
        clearInterval(id)
        setAnimDone(true)
        return
      }
      const boxIdx = idx % boxes
      setPlaced(prev => [...prev, boxIdx])
      setPopBox(boxIdx)
      counterRef.current = idx + 1
      setTimeout(() => setPopBox(p => (p === boxIdx ? null : p)), 280)
    }, 600)

    return () => clearInterval(id)
  }, [ei]) // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (ei + 1 >= examples.length) onDone()
    else setEi(e => e + 1)
  }

  const remaining = total - placed.length
  const boxCounts = Array.from({ length: boxes }, (_, j) => placed.filter(b => b === j).length)

  return (
    <div className="mission-screen">
      <Progress step={1} />
      <RoundDots total={examples.length} current={ei} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6A.watch')}</div>

        {/* Remaining pool */}
        <div style={{
          minHeight: 'clamp(38px,8vw,56px)',
          display: 'flex', flexWrap: 'wrap', gap: 4,
          justifyContent: 'center', alignItems: 'center',
          marginBottom: '0.4rem',
        }}>
          {remaining > 0
            ? Array.from({ length: remaining }, (_, i) => (
              <span key={i} style={{ fontSize: 'clamp(22px,5vw,32px)' }}>{SWEET}</span>
            ))
            : <span style={{ fontSize: 'clamp(14px,2.8vw,20px)', color: '#16a34a', fontWeight: 700 }}>
                {t('insight.allShared')}
              </span>
          }
        </div>

        {/* Boxes */}
        <div style={{ display: 'flex', gap: 'clamp(10px,2.5vw,24px)', justifyContent: 'center' }}>
          {Array.from({ length: boxes }, (_, j) => (
            <div key={j}
              className={`insight-share-box${animDone ? ' insight-share-box--correct' : ''}`}
              style={{
                minWidth: 'clamp(60px,13vw,90px)',
                transform: popBox === j ? 'scale(1.18)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              <div className="insight-share-box-sweets" style={{ fontSize: 'clamp(18px,4vw,28px)', minHeight: '1.8em' }}>
                {Array.from({ length: boxCounts[j] }, (_, k) => <span key={k}>{SWEET}</span>)}
              </div>
            </div>
          ))}
        </div>

        {animDone && (
          <div style={{ marginTop: '0.5rem', fontSize: 'clamp(15px,3vw,22px)', fontWeight: 700, color: '#16a34a', textAlign: 'center' }}>
            {each} {t('mission.6A.eachBox')}!
          </div>
        )}
      </div>
      <div className="mission-actions">
        <button className="mission-next-btn" onClick={next} style={{ visibility: animDone ? 'visible' : 'hidden' }}>
          {ei + 1 < examples.length ? t('mission.next') : t('mission.6A.letsGo')}
        </button>
      </div>
    </div>
  )
}

// ── Practice: share it yourself ──────────────────────────────────────────────

function genPractice() {
  const boxes = rnd(2, 3)
  const each = rnd(2, Math.max(2, Math.floor(10 / boxes)))
  return { boxes, each, total: boxes * each }
}

function ShareRound({ boxes, total, answer, onCorrect }) {
  const [boxCounts, setBoxCounts] = useState(() => Array(boxes).fill(0))
  const placed = boxCounts.reduce((s, c) => s + c, 0)
  const remaining = total - placed
  const correct = remaining === 0 && boxCounts.every(c => c === answer)

  useEffect(() => {
    if (correct) {
      const id = setTimeout(onCorrect, 800)
      return () => clearTimeout(id)
    }
  }, [correct]) // eslint-disable-line react-hooks/exhaustive-deps

  function addTo(i) {
    if (remaining <= 0) return
    setBoxCounts(prev => prev.map((c, idx) => idx === i ? c + 1 : c))
  }
  function removeFrom(i) {
    if (boxCounts[i] === 0) return
    setBoxCounts(prev => prev.map((c, idx) => idx === i ? c - 1 : c))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
      {/* Pool */}
      <div style={{
        minHeight: 'clamp(38px,8vw,56px)',
        display: 'flex', flexWrap: 'wrap', gap: 4,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {remaining > 0
          ? Array.from({ length: remaining }, (_, i) => (
            <span key={i} style={{ fontSize: 'clamp(22px,5vw,30px)' }}>{SWEET}</span>
          ))
          : <span style={{ fontSize: 'clamp(20px,4.5vw,30px)', color: '#16a34a', fontWeight: 900 }}>✓</span>
        }
      </div>

      {/* Boxes with +/- controls */}
      <div style={{ display: 'flex', gap: 'clamp(10px,2.5vw,24px)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {boxCounts.map((count, i) => {
          const isDone = remaining === 0
          const cls = [
            'insight-share-box',
            isDone && count === answer ? 'insight-share-box--correct' : '',
            isDone && count !== answer ? 'insight-share-box--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={i} className={cls} style={{ minWidth: 'clamp(64px,14vw,100px)' }}>
              <div className="insight-share-box-sweets" style={{ fontSize: 'clamp(16px,3.5vw,26px)', minHeight: '1.8em' }}>
                {Array.from({ length: count }, (_, k) => <span key={k}>{SWEET}</span>)}
              </div>
              <div className="insight-share-box-controls">
                <button className="insight-share-btn insight-share-btn--remove"
                  onClick={() => removeFrom(i)}
                  disabled={correct || count === 0}>−</button>
                <span className="insight-share-box-count">{count}</span>
                <button className="insight-share-btn insight-share-btn--add"
                  onClick={() => addTo(i)}
                  disabled={correct || remaining === 0}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Practice({ onDone }) {
  const { t } = useTranslation()
  const rounds = useMemo(() => Array.from({ length: 3 }, genPractice), [])
  const [ri, setRi] = useState(0)
  const { boxes, each, total } = rounds[Math.min(ri, rounds.length - 1)]

  function advance() {
    if (ri + 1 >= rounds.length) onDone()
    else setRi(r => r + 1)
  }

  return (
    <div className="mission-screen">
      <Progress step={2} />
      <RoundDots total={rounds.length} current={ri} />
      <div className="mission-body">
        <div className="mission-subtitle">{t('mission.6A.yourTurn')}</div>
        <ShareRound key={ri} boxes={boxes} total={total} answer={each} onCorrect={advance} />
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
      <Progress step={3} />
      <div className="mission-body">
        <div className="mission-complete-icon">🍬</div>
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

export default function Mission1_6A({ pupilId, onComplete }) {
  const [step, setStep] = useState(0)

  async function finish() {
    await supabase.rpc('complete_mission', { p_pupil_id: pupilId, p_special_mission: '1_6A' })
    setStep(3)
  }

  if (step === 0) return <Intro onDone={() => setStep(1)} />
  if (step === 1) return <Demo onDone={() => setStep(2)} />
  if (step === 2) return <Practice onDone={finish} />
  return <Complete onDone={onComplete} />
}
