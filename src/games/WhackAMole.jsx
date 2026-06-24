import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'
import { generateQuestion } from '../lib/questionGenerator'

const GRID_SIZE = 9
const MAX_ACTIVE = 5       // max moles visible simultaneously
const INITIAL_TIME = 15   // seconds
const CORRECT_BONUS = 2   // seconds added per correct hit
const MOLE_MIN_MS = 1800
const MOLE_MAX_MS = 3600
const SPAWN_INTERVAL_MS = 650

// Distractors: near-misses (high pedagogical value) + digit transpositions +
// random fill. Answer itself is never included.
function generateDistractors(answer, count) {
  const candidates = new Set()

  for (const d of [-2, -1, 1, 2]) {
    const v = answer + d
    if (v > 0) candidates.add(v)
  }

  const str = String(answer)
  if (str.length === 2) {
    const rev = parseInt(str[1] + str[0], 10)
    if (rev > 0 && rev !== answer) candidates.add(rev)
  }
  if (str.length === 3) {
    const s1 = parseInt(str[1] + str[0] + str[2], 10)
    const s2 = parseInt(str[0] + str[2] + str[1], 10)
    if (s1 > 0 && s1 !== answer) candidates.add(s1)
    if (s2 > 0 && s2 !== answer) candidates.add(s2)
  }

  for (let i = 0; i < 20 && candidates.size < count + 5; i++) {
    const delta = Math.floor(Math.random() * 12) + 3
    const v = answer + (Math.random() < 0.5 ? delta : -delta)
    if (v > 0 && v !== answer) candidates.add(v)
  }

  candidates.delete(answer)
  const arr = [...candidates]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
}

function WhackAMole({ pupilId, instinctLevel, avatar, onComplete }) {
  const { language } = useTranslation()

  const [view, setView] = useState('ready')
  const [displayScore, setDisplayScore] = useState(0)
  const [displayTime, setDisplayTime] = useState(INITIAL_TIME)
  const [creditsEarned, setCreditsEarned] = useState(0)
  // Holes state lives in a ref (mutated directly) with a tick counter to
  // trigger re-renders — same pattern as FloatingLogos. Avoids stale-closure
  // issues in the scheduler's setTimeout/setInterval callbacks.
  const [tick, setTick] = useState(0)
  const rerender = useCallback(() => setTick(n => n + 1), [])

  const holesRef = useRef(null)
  const questionRef = useRef(null)
  const distractorsRef = useRef([])
  const timeLeftMsRef = useRef(INITIAL_TIME * 1000)
  const scoreRef = useRef(0)
  const activeRef = useRef(false)
  const moleTimerRef = useRef(Array(GRID_SIZE).fill(null))
  const spawnIntervalRef = useRef(null)
  const countdownRef = useRef(null)
  const submittingRef = useRef(false)

  if (!holesRef.current) {
    holesRef.current = Array.from({ length: GRID_SIZE }, () => ({
      phase: 'empty', // 'empty' | 'up' | 'crushed'
      answer: null,
      isCorrect: false,
    }))
  }

  function getEmptyIndices() {
    return holesRef.current.reduce((acc, h, i) => { if (h.phase === 'empty') acc.push(i); return acc }, [])
  }

  function getActiveCount() {
    return holesRef.current.filter(h => h.phase === 'up').length
  }

  function hasCorrectOnScreen() {
    return holesRef.current.some(h => h.phase === 'up' && h.isCorrect)
  }

  function loadNextQuestion() {
    const { question, answer } = generateQuestion(Math.min(Math.max(instinctLevel, 1), 6), language)
    questionRef.current = { question, answer }
    distractorsRef.current = generateDistractors(answer, MAX_ACTIVE - 1)
  }

  function clearMoleTimer(idx) {
    if (moleTimerRef.current[idx]) {
      clearTimeout(moleTimerRef.current[idx])
      moleTimerRef.current[idx] = null
    }
  }

  function moleDown(idx) {
    clearMoleTimer(idx)
    if (holesRef.current[idx].phase === 'up') {
      holesRef.current[idx] = { phase: 'empty', answer: null, isCorrect: false }
      rerender()
    }
  }

  function spawnMole() {
    if (!activeRef.current) return
    const empty = getEmptyIndices()
    if (empty.length === 0 || getActiveCount() >= MAX_ACTIVE) return

    const idx = empty[Math.floor(Math.random() * empty.length)]
    const correctAnswer = questionRef.current?.answer
    let answer, isCorrect

    if (!hasCorrectOnScreen()) {
      answer = correctAnswer
      isCorrect = true
    } else {
      const usedAnswers = new Set(
        holesRef.current.filter(h => h.phase === 'up').map(h => h.answer)
      )
      const available = distractorsRef.current.filter(d => !usedAnswers.has(d))
      if (available.length === 0) return // all distractors already visible
      answer = available[Math.floor(Math.random() * available.length)]
      isCorrect = false
    }

    holesRef.current[idx] = { phase: 'up', answer, isCorrect }
    const duration = MOLE_MIN_MS + Math.random() * (MOLE_MAX_MS - MOLE_MIN_MS)
    moleTimerRef.current[idx] = setTimeout(() => moleDown(idx), duration)
    rerender()
  }

  function handleHit(idx) {
    if (!activeRef.current) return
    const hole = holesRef.current[idx]
    if (hole.phase !== 'up') return

    clearMoleTimer(idx)
    const wasCorrect = hole.isCorrect
    holesRef.current[idx] = { ...hole, phase: 'crushed' }
    rerender()

    if (wasCorrect) {
      scoreRef.current += 1
      setDisplayScore(scoreRef.current)
      // Cap at ~58s so the display doesn't wrap oddly
      timeLeftMsRef.current = Math.min(timeLeftMsRef.current + CORRECT_BONUS * 1000, 58000)
      setDisplayTime(Math.ceil(timeLeftMsRef.current / 1000))

      setTimeout(() => {
        if (!activeRef.current) return
        // Clear all moles and load the next question
        for (let i = 0; i < GRID_SIZE; i++) {
          clearMoleTimer(i)
          holesRef.current[i] = { phase: 'empty', answer: null, isCorrect: false }
        }
        loadNextQuestion()
        rerender()
        // Staggered spawns for the new question
        spawnMole()
        setTimeout(() => { if (activeRef.current) spawnMole() }, 280)
        setTimeout(() => { if (activeRef.current) spawnMole() }, 560)
        setTimeout(() => { if (activeRef.current) spawnMole() }, 840)
      }, 380)
    } else {
      // Wrong hit: mole stays crushed briefly then clears
      setTimeout(() => {
        if (holesRef.current[idx].phase === 'crushed') {
          holesRef.current[idx] = { phase: 'empty', answer: null, isCorrect: false }
          rerender()
        }
      }, 360)
    }
  }

  function startGame() {
    activeRef.current = true
    scoreRef.current = 0
    timeLeftMsRef.current = INITIAL_TIME * 1000
    submittingRef.current = false
    setDisplayScore(0)
    setDisplayTime(INITIAL_TIME)
    setCreditsEarned(0)

    for (let i = 0; i < GRID_SIZE; i++) {
      clearMoleTimer(i)
      holesRef.current[i] = { phase: 'empty', answer: null, isCorrect: false }
    }

    loadNextQuestion()

    countdownRef.current = setInterval(() => {
      timeLeftMsRef.current -= 100
      if (timeLeftMsRef.current <= 0) {
        timeLeftMsRef.current = 0
        setDisplayTime(0)
        clearInterval(countdownRef.current)
        clearInterval(spawnIntervalRef.current)
        finishGame()
      } else {
        setDisplayTime(Math.ceil(timeLeftMsRef.current / 1000))
      }
    }, 100)

    spawnIntervalRef.current = setInterval(() => {
      if (!activeRef.current) return
      if (getActiveCount() < MAX_ACTIVE) spawnMole()
    }, SPAWN_INTERVAL_MS)

    // Stagger the very first moles so the screen doesn't flood all at once
    setTimeout(() => spawnMole(), 180)
    setTimeout(() => { if (activeRef.current) spawnMole() }, 480)
    setTimeout(() => { if (activeRef.current) spawnMole() }, 780)

    setView('playing')
  }

  async function finishGame() {
    if (submittingRef.current) return
    submittingRef.current = true
    activeRef.current = false

    clearInterval(countdownRef.current)
    clearInterval(spawnIntervalRef.current)
    for (let i = 0; i < GRID_SIZE; i++) clearMoleTimer(i)

    const finalScore = scoreRef.current
    let earned = finalScore // 1 credit per correct hit as local fallback

    if (finalScore > 0 && pupilId) {
      try {
        const { data } = await supabase.rpc('submit_whack_a_mole_result', {
          p_pupil_id: pupilId,
          p_score: finalScore,
        })
        if (data?.credits_earned != null) earned = data.credits_earned
      } catch {
        // Silently fall back to local calculation during dev/before RPC exists
      }
    }

    setCreditsEarned(earned)
    setView('results')
  }

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false
      clearInterval(countdownRef.current)
      clearInterval(spawnIntervalRef.current)
      moleTimerRef.current.forEach(t => { if (t) clearTimeout(t) })
    }
  }, [])

  const holes = holesRef.current ?? []

  // ─── Ready screen ────────────────────────────────────────────────────────────
  if (view === 'ready') {
    return (
      <div className="screen wam-ready-screen">
        <h1>Whack-a-Mole!</h1>
        <p className="tagline">
          Whack the mole with the right answer!
        </p>
        <p className="wam-rules-line">
          Start with {INITIAL_TIME}s · +{CORRECT_BONUS}s per correct hit
        </p>
        <AvatarDisplay avatar={avatar ?? DEFAULT_AVATAR} size={100} state="wave" />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={startGame}>Play!</button>
          <button className="button-secondary" onClick={onComplete}>Back</button>
        </div>
      </div>
    )
  }

  // ─── Results screen ───────────────────────────────────────────────────────────
  if (view === 'results') {
    return (
      <div className="screen wam-results-screen">
        <div className="results-celebration-header">
          <AvatarDisplay
            avatar={avatar ?? DEFAULT_AVATAR}
            size={72}
            state={displayScore > 0 ? 'celebrate' : 'idle'}
          />
          <h1 className="results-celebration-title">
            {displayScore > 0 ? 'Nice whacking!' : 'Keep trying!'}
          </h1>
        </div>
        <div className="results-summary">
          <div className="stat-box stat-box--large stat-box--score">
            <div className="stat-number">🎯 {displayScore}</div>
            <div className="stat-label">Correct hits</div>
          </div>
          <div className="stat-box stat-box--large stat-box--coins">
            <div className="stat-number">🪙 +{creditsEarned}</div>
            <div className="stat-label">Credits</div>
          </div>
        </div>
        <div className="results-action-btns">
          <button className="results-action-btn results-action-btn--secondary" onClick={startGame}>
            Play again
          </button>
          <button className="results-action-btn results-action-btn--primary" onClick={onComplete}>
            My Hub
          </button>
        </div>
      </div>
    )
  }

  // ─── Playing screen ───────────────────────────────────────────────────────────
  return (
    <div className="wam-screen">
      <div className="wam-header">
        <div className="wam-question">{questionRef.current?.question ?? ''}</div>
      </div>

      <div className="wam-grid-wrapper">
        <div className="wam-grid">
          {holes.map((hole, i) => (
            <div key={i} className="wam-cell">
              <div
                className={`wam-mole-wrap${hole.phase !== 'empty' ? ' wam-mole-wrap--visible' : ''}`}
                onClick={() => handleHit(i)}
              >
                <div className={`wam-mole-body${hole.phase === 'up' ? ' wam-mole-body--wobble' : ''}`}>
                  <img
                    src={
                      hole.phase === 'crushed'
                        ? '/games/whack-a-mole/mole-crushed.svg'
                        : '/games/whack-a-mole/mole-alive.svg'
                    }
                    className={`wam-mole-img${hole.phase === 'crushed' ? ' wam-mole-img--crushed' : ''}`}
                    alt=""
                    draggable={false}
                  />
                  <div className="wam-sign">
                    {hole.phase !== 'empty' ? hole.answer : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wam-footer">
        <div className={`wam-timer ${displayTime <= 5 ? 'wam-timer--urgent' : ''}`}>
          ⏱ {displayTime}s
        </div>
        <span className="wam-score-display">✓ {displayScore}</span>
      </div>
    </div>
  )
}

export default WhackAMole
