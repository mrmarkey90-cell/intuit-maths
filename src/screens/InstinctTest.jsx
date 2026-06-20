import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n/LanguageContext'
import NumberPad from '../components/NumberPad'
import { generateQuestion } from '../lib/questionGenerator'

const SESSION_DURATION = 60
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

function QuickTester() {
  const { language } = useTranslation()
  const [stage, setStage] = useState(1)
  const [question, setQuestion] = useState(() => generateQuestion(1, language))
  const [entered, setEntered] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function newQuestion(forStage) {
    setQuestion(generateQuestion(forStage, language))
    setEntered(null)
    setRevealed(false)
  }

  function handleStageChange(s) {
    setStage(s)
    newQuestion(s)
  }

  function handleSubmit(value) {
    setEntered(parseFloat(value))
    setRevealed(true)
  }

  const correct = revealed && entered === question.answer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ marginBottom: '1rem' }}>Quick Question Tester</h2>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Stage</label>
        <select
          value={stage}
          onChange={e => handleStageChange(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Stage {s}</option>)}
        </select>
        <button className="button-secondary" onClick={() => newQuestion(stage)}>New question</button>
      </div>

      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: '0.5rem' }}>
        {question.domain} / {question.subdomain}
      </p>
      <div className="question-display" style={{ width: 320, height: 110, margin: '0 auto 1.5rem' }}>
        <p className="question-text">{question.question}</p>
      </div>

      <div style={{ width: 260 }}>
        <NumberPad onSubmit={handleSubmit} stage={stage} disabled={revealed} />
      </div>

      <div style={{ marginTop: '1rem', height: 24 }}>
        {revealed && (
          <span style={{ fontSize: 14, fontWeight: 600, color: correct ? '#16a34a' : '#dc2626' }}>
            {correct ? '✓ Correct' : `✗ Wrong — correct answer was ${question.answer}`}
          </span>
        )}
      </div>
    </div>
  )
}

// Mirrors PupilSession's real "questions" view (same CSS classes, same
// timer/skip-penalty mechanics) so this exercises the actual production
// UI rather than an approximation -- just driven by a local 60s timer
// instead of a session_id, since there's no real session/pupil here.
function SessionPreview({ stage, language, onRestart }) {
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [skipCooldown, setSkipCooldown] = useState(0)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [finished, setFinished] = useState(false)

  const questionRef = useRef(null)
  const feedbackRef = useRef(null)
  const answersRef = useRef([])
  const stageRef = useRef(stage)
  const languageRef = useRef(language)
  const timerRef = useRef(null)
  const skipRef = useRef(null)
  const finishedRef = useRef(false)

  useEffect(() => { stageRef.current = stage }, [stage])
  useEffect(() => { languageRef.current = language }, [language])

  function nextQuestion() {
    feedbackRef.current = null
    setFeedback(null)
    const q = generateQuestion(stageRef.current, languageRef.current)
    questionRef.current = q
    setQuestion(q)
  }

  useEffect(() => {
    const endTime = Date.now() + SESSION_DURATION * 1000
    nextQuestion()

    timerRef.current = setInterval(() => {
      const t = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        clearInterval(skipRef.current)
        if (!finishedRef.current) {
          finishedRef.current = true
          setFinished(true)
        }
      }
    }, 500)

    return () => {
      clearInterval(timerRef.current)
      clearInterval(skipRef.current)
    }
  }, [])

  function handleSubmit(inputValue) {
    const q = questionRef.current
    if (!q || feedbackRef.current !== null) return

    const entered = parseFloat(inputValue)
    const correct = entered === q.answer

    feedbackRef.current = 'submitted'
    setFeedback('submitted')

    const updated = [...answersRef.current, { ...q, entered, correct }]
    answersRef.current = updated
    setAnswers(updated)

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

  if (finished) {
    const score = answers.filter(a => a.correct).length
    const total = answers.length
    const pct = total > 0 ? Math.round((score / total) * 100) : 0

    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Results</h2>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: '1rem' }}>{score} / {total} correct ({pct}%)</p>
        <div style={{
          maxWidth: 480, margin: '0 auto 1rem', textAlign: 'left', maxHeight: 320,
          overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.25rem 1rem',
        }}>
          {answers.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: '0.75rem 0' }}>No questions answered.</p>
          ) : answers.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '6px 0',
                borderBottom: i < answers.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 14,
              }}
            >
              <span>{a.question} {a.answer}</span>
              <span style={{ color: a.correct ? '#16a34a' : '#dc2626', fontWeight: 600, flexShrink: 0 }}>
                {a.entered}{a.correct ? ' ✓' : ' ✗'}
              </span>
            </div>
          ))}
        </div>
        <button className="button-secondary" onClick={onRestart}>Run another test</button>
      </div>
    )
  }

  const isDisabled = feedback !== null || skipCooldown > 0

  return (
    <div className="question-screen" style={{ minHeight: 'auto' }}>
      <TimerBar timeLeft={timeLeft} />
      <div className="question-body">
        <div className="question-panel">
          <div className={`question-display ${feedback ? `question-display--${feedback}` : ''}`}>
            <p className="question-text">{question?.question ?? '...'}</p>
          </div>
        </div>
        <div className="numpad-panel">
          {skipCooldown > 0 && (
            <div className="skip-penalty">Skip penalty: {skipCooldown}s</div>
          )}
          <NumberPad onSubmit={handleSubmit} stage={stage} disabled={isDisabled} />
          <button className="skip-btn" onClick={handleSkip} disabled={skipCooldown > 0}>
            {skipCooldown > 0 ? `Skip (${skipCooldown}s)` : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InstinctTest() {
  const { language, setLanguage } = useTranslation()
  const [stage, setStage] = useState(1)
  const [showSession, setShowSession] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)

  function startTest() {
    setShowSession(true)
    setSessionKey(k => k + 1)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Instinct Test (dev only)</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Previews procedural question generation per stage and the real timed-session UI -- never linked from any real pupil-facing screen.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Question language (dev only)</label>
        <button
          className="button-secondary"
          style={{ fontWeight: language === 'en' ? 700 : 400 }}
          onClick={() => setLanguage('en')}
        >
          English
        </button>
        <button
          className="button-secondary"
          style={{ fontWeight: language === 'cy' ? 700 : 400 }}
          onClick={() => setLanguage('cy')}
        >
          Cymraeg
        </button>
      </div>

      <QuickTester key={language} />

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <h2 style={{ marginBottom: '1rem' }}>Full Test Preview (real 60s timed session)</h2>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Stage</label>
        <select
          value={stage}
          onChange={e => setStage(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Stage {s}</option>)}
        </select>
        <button className="button-secondary" onClick={startTest}>Start new test</button>
      </div>

      {showSession && (
        <SessionPreview key={sessionKey} stage={stage} language={language} onRestart={startTest} />
      )}
    </div>
  )
}

export default InstinctTest
