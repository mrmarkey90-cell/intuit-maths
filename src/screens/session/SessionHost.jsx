import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../../supabaseClient'
import { useTranslation } from '../../i18n/LanguageContext'
import AvatarDisplay from '../../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../../lib/avatarConfig'

const SESSION_DURATION = 60
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
  const { t } = useTranslation()
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    await supabase.rpc('end_session', { p_session_id: session.session_id })
    onEnd()
  }
  const [view, setView] = useState('lobby') // lobby | active | marking | results
  const [participants, setParticipants] = useState([])
  // pupil_id → participant row, updated in real-time during active phase
  const [participantMap, setParticipantMap] = useState({})
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION)
  const [graceLeft, setGraceLeft] = useState(GRACE_PERIOD)
  const [comparison, setComparison] = useState(null)
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const graceRef = useRef(null)
  const channelRef = useRef(null)

  const joinUrl = `https://intuited.uk/${session.join_code}`

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
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function handleBegin() {
    clearInterval(pollRef.current)
    const { data: startedAt } = await supabase.rpc('start_session', { p_session_id: session.session_id })
    if (!startedAt) return

    // Seed the map with everyone who joined the lobby (total/score still null)
    const { data: parts } = await supabase.rpc('get_session_participants', { p_session_id: session.session_id })
    const initial = {}
    if (parts) for (const p of parts) initial[p.pupil_id] = p
    setParticipantMap(initial)

    const endTime = new Date(startedAt).getTime() + SESSION_DURATION * 1000
    const msUntilStart = new Date(startedAt).getTime() - Date.now()
    await new Promise(r => setTimeout(r, Math.max(0, msUntilStart)))

    setView('active')
    startActiveTimer(endTime)
    startRealtimeSubscription()
  }

  function startRealtimeSubscription() {
    channelRef.current = supabase
      .channel(`session-${session.session_id}`)
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        setParticipantMap(prev => {
          const prevTotal = prev[payload.pupil_id]?.total ?? 0
          if (payload.total > prevTotal) playPing()
          return { ...prev, [payload.pupil_id]: { ...(prev[payload.pupil_id] ?? {}), total: payload.total } }
        })
      })
      .subscribe()
  }

  function startActiveTimer(endTime) {
    const tick = async () => {
      const t = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      setTimeLeft(t)

      if (t <= 0) {
        clearInterval(timerRef.current)
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
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
        const [{ data: parts }, { data: cmp }] = await Promise.all([
          supabase.rpc('get_session_participants', { p_session_id: session.session_id }),
          supabase.rpc('get_class_challenge_comparison', {
            p_class_id: cls.id,
            p_current_session_id: session.session_id,
          }),
        ])
        if (parts) setParticipants(Array.isArray(parts) ? parts : [])
        if (cmp) setComparison(cmp)
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
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
          <button className="button-secondary" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? t('sessionHost.cancelling') : t('sessionHost.cancelSession')}
          </button>
        </header>

        <main className="dashboard-main" style={{ maxWidth: 720 }}>
          <div className="page-title">
            <h1>{t('sessionHost.lobbyTitle')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <section className="dashboard-section">
            <div className="section-heading"><h2>{t('sessionHost.sessionLink')}</h2></div>
            <div className="session-link-block">
              <div className="session-qr">
                <QRCode value={joinUrl} size={140} />
              </div>
              <div className="session-link-info">
                <p className="note" style={{ marginBottom: '0.5rem' }}>{t('sessionHost.pupilsGoTo')}</p>
                <code className="session-code-display">{joinUrl.replace('https://', '')}</code>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <h2>{t('sessionHost.pupilsReady')}</h2>
              <span className="section-count">{t('sessionHost.joinedCount').replace('{n}', joinedCount).replace('{m}', totalPupils)}</span>
            </div>
            <div className="lobby-grid">
              {pupilsWithStatus.map(p => (
                <div key={p.id} className={`lobby-tile ${p.joined ? 'lobby-tile--ready' : ''}`}>
                  <AvatarDisplay avatar={p.avatar ?? DEFAULT_AVATAR} size={48} />
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
              {joinedCount === 0 ? t('sessionHost.waitingForPupils') : t('sessionHost.begin').replace('{n}', joinedCount)}
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'active') {
    const allRows = Object.values(participantMap)
    const totalAnswered = allRows.reduce((s, p) => s + (p.total ?? 0), 0)

    return (
      <div className="session-active">
        <div className="session-timer" style={{ color: timeLeft <= 15 ? '#f87171' : undefined }}>
          {fmt(timeLeft)}
        </div>
        <p className="session-active-label">{t('sessionHost.inProgress')}</p>
        <div className="session-stats">
          <div className="stat-box">
            <div className="stat-number">{allRows.length}</div>
            <div className="stat-label">{t('sessionHost.playing')}</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{totalAnswered}</div>
            <div className="stat-label">{t('sessionHost.answered')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'marking') {
    return (
      <div className="session-active">
        <div className="session-timer" style={{ fontSize: '3rem', color: '#818cf8' }}>
          {t('sessionHost.marking')}
        </div>
        <p className="session-active-label">{t('sessionHost.resultsIn').replace('{n}', graceLeft)}</p>
      </div>
    )
  }

  // Results — fetched fresh after grace period
  const totalAnswered = participants.reduce((s, p) => s + (p.total ?? 0), 0)
  const totalCorrect = participants.reduce((s, p) => s + (p.score ?? 0), 0)
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 720 }}>
        <div className="page-title">
          <h1>{t('sessionHost.complete')}</h1>
          <span className="tier-badge">{cls.name}</span>
        </div>
        <section className="dashboard-section">
          <div className="results-summary">
            <div className="stat-box stat-box--large">
              <div className="stat-number">{totalAnswered}</div>
              <div className="stat-label">{t('sessionHost.questionsAttempted')}</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">{totalCorrect}</div>
              <div className="stat-label">{t('sessionHost.correct')}</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">{pct}%</div>
              <div className="stat-label">{t('sessionHost.classAccuracy')}</div>
            </div>
          </div>
          {comparison?.previous && (() => {
            const prev = comparison.previous
            const prevPct = prev.answered > 0 ? Math.round((prev.correct / prev.answered) * 100) : 0
            const diff = pct - prevPct
            const key = diff > 0 ? 'sessionHost.vsLastSessionUp' : diff < 0 ? 'sessionHost.vsLastSessionDown' : 'sessionHost.vsLastSessionSame'
            return (
              <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center' }}>
                {t(key)
                  .replace('{n}', Math.abs(diff))
                  .replace('{a}', prev.correct)
                  .replace('{b}', prev.answered)
                  .replace('{pct}', prevPct)}
              </p>
            )
          })()}
        </section>

        <button className="button-secondary" onClick={onEnd} style={{ marginTop: '0.5rem' }}>
          {t('sessionHost.backToClassDashboard')}
        </button>
      </main>
    </div>
  )
}

export default SessionHost
