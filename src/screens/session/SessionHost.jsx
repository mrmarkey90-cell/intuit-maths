import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../../supabaseClient'

const SESSION_DURATION = 90
const GRACE_PERIOD = 5

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

function SessionHost({ school, cls, session, classPupils, onEnd }) {
  const [view, setView] = useState('lobby') // lobby | active | marking | results
  const [participants, setParticipants] = useState([])
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [graceLeft, setGraceLeft] = useState(GRACE_PERIOD)
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const graceRef = useRef(null)
  const prevTotalRef = useRef(0)

  const joinUrl = `https://intuited.uk/play/${session.join_code}`

  function startLobbyPolling() {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('get_session_participants', { p_session_id: session.session_id })
      if (data) setParticipants(Array.isArray(data) ? data : [])
    }, 2000)
  }

  useEffect(() => {
    startLobbyPolling()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
      clearInterval(graceRef.current)
    }
  }, [])

  async function handleBegin() {
    clearInterval(pollRef.current)
    const { data: startedAt } = await supabase.rpc('start_session', { p_session_id: session.session_id })
    if (!startedAt) return

    const endTime = new Date(startedAt).getTime() + SESSION_DURATION * 1000

    const msUntilStart = new Date(startedAt).getTime() - Date.now()
    await new Promise(r => setTimeout(r, Math.max(0, msUntilStart)))

    setView('active')
    startActiveTimer(endTime)
    startActivePolling()
  }

  function startActivePolling() {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('get_session_participants', { p_session_id: session.session_id })
      if (data) {
        const updated = Array.isArray(data) ? data : []
        const newTotal = updated.reduce((s, p) => s + (p.total ?? 0), 0)
        if (newTotal > prevTotalRef.current) playPing()
        prevTotalRef.current = newTotal
        setParticipants(updated)
      }
    }, 2000)
  }

  function startActiveTimer(endTime) {
    const tick = async () => {
      const t = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      setTimeLeft(t)

      if (t <= 0) {
        clearInterval(timerRef.current)
        clearInterval(pollRef.current)
        await supabase.rpc('end_session', { p_session_id: session.session_id })
        setView('marking')
        startGracePeriod()
      }
    }
    tick()
    timerRef.current = setInterval(tick, 500)
  }

  function startGracePeriod() {
    let g = GRACE_PERIOD
    setGraceLeft(g)
    graceRef.current = setInterval(async () => {
      g -= 1
      setGraceLeft(g)
      if (g <= 0) {
        clearInterval(graceRef.current)
        // Final fetch of all submitted results
        const { data } = await supabase.rpc('get_session_participants', { p_session_id: session.session_id })
        if (data) setParticipants(Array.isArray(data) ? data : [])
        setView('results')
      }
    }, 1000)
  }

  const joinedCount = participants.length
  const totalPupils = classPupils.length
  const pupilsWithStatus = classPupils.map(p => ({
    ...p,
    joined: participants.some(pp => pp.pupil_id === p.id),
  }))

  if (view === 'lobby') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Class Challenge — Lobby</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
        </header>

        <main className="dashboard-main" style={{ maxWidth: 720 }}>
          <section className="dashboard-section">
            <div className="section-heading"><h2>Session link</h2></div>
            <div className="session-link-block">
              <div className="session-qr">
                <QRCode value={joinUrl} size={140} />
              </div>
              <div className="session-link-info">
                <p className="note" style={{ marginBottom: '0.5rem' }}>Pupils go to:</p>
                <code className="session-code-display">{joinUrl.replace('https://', '')}</code>
                <p className="note" style={{ marginTop: '0.5rem' }}>
                  Session code: <strong>{session.join_code}</strong>
                </p>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <h2>Pupils ready</h2>
              <span className="section-count">{joinedCount} / {totalPupils} joined</span>
            </div>
            <div className="lobby-grid">
              {pupilsWithStatus.map(p => (
                <div key={p.id} className={`lobby-tile ${p.joined ? 'lobby-tile--ready' : ''}`}>
                  <AvatarDisplay avatar={p.avatar ?? { face: 0, hat: 0, glasses: 0, scarf: 0 }} size={48} />
                  <span className="lobby-tile-name">{p.first_name}</span>
                  {p.joined && <span className="lobby-ready-dot" />}
                </div>
              ))}
            </div>
            <button
              onClick={handleBegin}
              disabled={joinedCount === 0}
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              {joinedCount === 0 ? 'Waiting for pupils...' : `Begin! (${joinedCount} ready)`}
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'active') {
    const totalAnswered = participants.reduce((s, p) => s + (p.total ?? 0), 0)
    const totalCorrect = participants.reduce((s, p) => s + (p.score ?? 0), 0)
    const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null

    return (
      <div className="session-active">
        <div className="session-timer" style={{ color: timeLeft <= 15 ? '#f87171' : undefined }}>
          {fmt(timeLeft)}
        </div>
        <p className="session-active-label">Maths Challenge in progress</p>
        <div className="session-stats">
          <div className="stat-box">
            <div className="stat-number">{participants.length}</div>
            <div className="stat-label">Playing</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{totalAnswered}</div>
            <div className="stat-label">Answered</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{pct !== null ? `${pct}%` : '—'}</div>
            <div className="stat-label">Correct</div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'marking') {
    return (
      <div className="session-active">
        <div className="session-timer" style={{ fontSize: '3rem', color: '#818cf8' }}>
          Marking your answers...
        </div>
        <p className="session-active-label">Results in {graceLeft}s</p>
      </div>
    )
  }

  // Results
  const totalAnswered = participants.reduce((s, p) => s + (p.total ?? 0), 0)
  const totalCorrect = participants.reduce((s, p) => s + (p.score ?? 0), 0)
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Challenge Complete</h1>
          <span className="tier-badge">{cls.name}</span>
        </div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 720 }}>
        <section className="dashboard-section">
          <div className="results-summary">
            <div className="stat-box stat-box--large">
              <div className="stat-number">{totalAnswered}</div>
              <div className="stat-label">Questions attempted</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">{totalCorrect}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">{pct}%</div>
              <div className="stat-label">Class accuracy</div>
            </div>
          </div>
        </section>

        <button className="button-secondary" onClick={onEnd} style={{ marginTop: '0.5rem' }}>
          Back to class dashboard
        </button>
      </main>
    </div>
  )
}

export default SessionHost
