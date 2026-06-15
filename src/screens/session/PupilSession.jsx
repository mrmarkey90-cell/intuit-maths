import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import AvatarDisplay from '../../components/AvatarDisplay'
import NumberPad from '../../components/NumberPad'
import { generateQuestion } from '../../lib/questionGenerator'

const SESSION_DURATION = 90
const SKIP_PENALTY = 5

function TimerBar({ timeLeft }) {
  const pct = (timeLeft / SESSION_DURATION) * 100
  const color = timeLeft <= 15 ? '#e53e3e' : timeLeft <= 30 ? '#f59e0b' : '#4f46e5'
  return (
    <div className="timer-bar-track">
      <div className="timer-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function LevelDownOffer({ pupilId, currentStage }) {
  const [accepted, setAccepted] = useState(false)
  async function accept() {
    await supabase.rpc('lower_pupil_stage', { p_pupil_id: pupilId })
    setAccepted(true)
  }
  if (accepted) return <p className="streak-info">Dropped to Stage {currentStage - 1}</p>
  return (
    <div className="level-down-offer">
      <p>You've had a few tricky sessions. Drop to Stage {currentStage - 1}?</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <button onClick={accept} className="button-secondary">Yes please</button>
        <button onClick={() => setAccepted(true)} className="button-secondary">Stay here</button>
      </div>
    </div>
  )
}

function PupilSession() {
  const { code } = useParams()
  const sessionCode = code.toUpperCase()

  const [view, setView] = useState('loading')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [pupils, setPupils] = useState([])
  const [pupil, setPupil] = useState(null)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [skipCooldown, setSkipCooldown] = useState(0)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [results, setResults] = useState(null)

  // Refs to avoid stale closures in timers/intervals
  const pupilRef = useRef(null)
  const questionRef = useRef(null)
  const feedbackRef = useRef(null)
  const answersRef = useRef([])
  const sessionInfoRef = useRef(null)
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const skipRef = useRef(null)
  const finishedRef = useRef(false)

  useEffect(() => { feedbackRef.current = feedback }, [feedback])
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.rpc('get_session_info', { p_join_code: sessionCode })
      if (error || !data || data.error) { setView('error'); return }
      setSessionInfo(data)
      sessionInfoRef.current = data

      const { data: pupilData } = await supabase.rpc('get_class_pupils', { p_join_code: data.class_join_code })
      setPupils(pupilData ?? [])

      const stored = localStorage.getItem('pupilProfile')
      if (stored) {
        try {
          const p = JSON.parse(stored)
          const match = (pupilData ?? []).find(pp => pp.id === p.id)
          if (match) { await doJoin(data, match); return }
        } catch {}
      }
      setView('join')
    }
    init()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
      clearInterval(skipRef.current)
    }
  }, [])

  async function doJoin(info, p) {
    const { data, error } = await supabase.rpc('join_session', {
      p_join_code: sessionCode,
      p_pupil_id: p.id,
    })
    if (error || data?.error) { setView('error'); return }

    pupilRef.current = p
    setPupil(p)
    localStorage.setItem('pupilProfile', JSON.stringify(p))
    setView('lobby')
    pollForStart()
  }

  function pollForStart() {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('get_session_info', { p_join_code: sessionCode })
      if (!data || data.error) return
      sessionInfoRef.current = data

      if (data.status === 'active' && data.started_at) {
        clearInterval(pollRef.current)
        const startTime = new Date(data.started_at).getTime()
        const msUntilStart = startTime - Date.now()
        if (msUntilStart > 0) {
          setTimeout(() => beginQuestions(data.started_at), msUntilStart)
        } else {
          beginQuestions(data.started_at)
        }
      }
    }, 1500)
  }

  function nextQuestion() {
    const p = pupilRef.current
    if (!p) return
    feedbackRef.current = null
    setFeedback(null)
    const q = generateQuestion(p.current_stage ?? 1)
    questionRef.current = q
    setQuestion(q)
  }

  function beginQuestions(startedAt) {
    const endTime = new Date(startedAt).getTime() + SESSION_DURATION * 1000
    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000))
    setTimeLeft(remaining)
    setView('questions')
    nextQuestion()

    timerRef.current = setInterval(() => {
      const t = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        clearInterval(skipRef.current)
        if (!finishedRef.current) finishSession()
      }
    }, 500)
  }

  function handleSubmit(inputValue) {
    const q = questionRef.current
    if (!q || feedbackRef.current !== null) return

    const entered = parseFloat(inputValue)
    const correct = entered === q.answer

    feedbackRef.current = correct ? 'correct' : 'wrong'
    setFeedback(correct ? 'correct' : 'wrong')

    setAnswers(prev => {
      const updated = [...prev, { ...q, entered, correct }]
      answersRef.current = updated
      return updated
    })

    setTimeout(() => nextQuestion(), 600)
  }

  function handleSkip() {
    if (skipCooldown > 0 || !questionRef.current) return
    nextQuestion()
    setSkipCooldown(SKIP_PENALTY)
    let c = SKIP_PENALTY
    skipRef.current = setInterval(() => {
      c -= 1
      setSkipCooldown(c)
      if (c <= 0) clearInterval(skipRef.current)
    }, 1000)
  }

  async function finishSession() {
    finishedRef.current = true
    setView('results')
    const all = answersRef.current
    const score = all.filter(a => a.correct).length
    const total = all.length
    const si = sessionInfoRef.current

    const { data, error } = await supabase.rpc('submit_attempt', {
      p_session_id: si.session_id,
      p_pupil_id: pupilRef.current.id,
      p_score: score,
      p_total: total,
    })
    if (error) console.error('submit_attempt failed:', error)
    setResults({ score, total, ...(data ?? {}) })
  }

  // ── Views ──────────────────────────────────────

  if (view === 'loading') return <div className="screen"><p>Loading...</p></div>

  if (view === 'error') return (
    <div className="screen">
      <h1>Session not found</h1>
      <p className="tagline">Ask your teacher for the link</p>
    </div>
  )

  if (view === 'join') return (
    <div className="screen">
      <h1>Who are you?</h1>
      <p className="tagline">{sessionInfo?.class_name}</p>
      <div className="pupil-grid">
        {pupils.map(p => (
          <button key={p.id} className="pupil-tile" onClick={() => doJoin(sessionInfo, p)}>
            <AvatarDisplay avatar={p.avatar ?? { face: 0, hat: 0, glasses: 0, scarf: 0 }} size={72} />
            <span className="pupil-tile-name">{p.first_name}</span>
            <span className="pupil-tile-surname">{p.last_name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (view === 'lobby') return (
    <div className="screen">
      <AvatarDisplay avatar={pupil?.avatar ?? { face: 0, hat: 0, glasses: 0, scarf: 0 }} size={100} />
      <h1 style={{ marginTop: '1rem' }}>{pupil?.first_name}</h1>
      <p className="tagline">You're in! Waiting for your teacher...</p>
      <div className="lobby-waiting-dots"><span /><span /><span /></div>
    </div>
  )

  if (view === 'questions') {
    const isDisabled = feedbackRef.current !== null || skipCooldown > 0
    return (
      <div className="question-screen">
        <TimerBar timeLeft={timeLeft} />
        <div className="question-body">
          {skipCooldown > 0 && (
            <div className="skip-penalty">+{skipCooldown}s penalty</div>
          )}
          <div className={`question-display ${feedback ? `question-display--${feedback}` : ''}`}>
            <p className="question-text">{question?.question ?? '...'}</p>
          </div>
          <NumberPad
            onSubmit={handleSubmit}
            stage={pupil?.current_stage ?? 1}
            disabled={isDisabled}
          />
          <button className="skip-btn" onClick={handleSkip} disabled={skipCooldown > 0}>
            {skipCooldown > 0 ? `Skip (${skipCooldown}s)` : 'Skip'}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    const score = results?.score ?? 0
    const total = results?.total ?? 0
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const prevScore = results?.prev_score
    const prevTotal = results?.prev_total
    const creditsEarned = results?.credits_earned ?? 0
    const levelUp = results?.level_up ?? false
    const levelDownOffer = results?.level_down_offer ?? false
    const newStage = results?.new_stage

    let comparison = null
    if (prevScore != null && prevTotal > 0) {
      const prevPct = Math.round((prevScore / prevTotal) * 100)
      const diff = pct - prevPct
      comparison = diff > 0 ? `+${diff}% from last time` : diff < 0 ? `${diff}% from last time` : 'Same as last time'
    }

    if (!results) return <div className="screen"><p>Submitting...</p></div>

    return (
      <div className="screen">
        {levelUp && (
          <div className="level-up-banner">Level up! Moving to Stage {newStage}</div>
        )}
        <AvatarDisplay avatar={pupil?.avatar ?? { face: 0, hat: 0, glasses: 0, scarf: 0 }} size={96} />
        <h1 style={{ marginTop: '1rem' }}>{score} correct</h1>
        <p className="tagline">out of {total} attempted — {pct}%</p>
        {comparison && <p className="results-comparison">{comparison}</p>}
        <div className="credits-earned">+{creditsEarned} credits</div>
        {!levelUp && results?.new_streak > 0 && (
          <p className="streak-info">{results.new_streak} / 3 towards next level</p>
        )}
        {levelDownOffer && !levelUp && (
          <LevelDownOffer pupilId={pupil?.id} currentStage={pupil?.current_stage ?? 1} />
        )}
        <p className="note" style={{ marginTop: '2rem' }}>Write your score in your book!</p>
      </div>
    )
  }

  return null
}

export default PupilSession
