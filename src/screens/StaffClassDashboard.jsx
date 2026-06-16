import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../supabaseClient'
import SessionHost from './session/SessionHost'
import PupilDetail from './PupilDetail'

function StaffClassDashboard({ school, cls, onChangeClass, onSignOut }) {
  const [view, setView] = useState('main')
  const [session, setSession] = useState(null)       // actively shown in SessionHost
  const [activeSession, setActiveSession] = useState(null) // in DB but not yet resumed
  const [weeklyUsed, setWeeklyUsed] = useState(false)
  const [classPupils, setClassPupils] = useState([])
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [selectedPupil, setSelectedPupil] = useState(null)
  const [hubCopied, setHubCopied] = useState(false)
  const [profileCopied, setProfileCopied] = useState(false)

  const profileUrl = `https://intuited.uk/join/${cls.join_code}`
  const profileDisplayUrl = `intuited.uk/join/${cls.join_code}`
  const hubUrl = `https://intuited.uk/hub/${cls.join_code}`
  const hubDisplayUrl = `intuited.uk/hub/${cls.join_code}`

  useEffect(() => {
    supabase.rpc('get_class_session_status', { p_class_id: cls.id }).then(({ data }) => {
      if (!data) return
      setWeeklyUsed(data.weekly_used)
      if (data.active_session) setActiveSession(data.active_session)
    })
    loadPupils()
  }, [cls.id, cls.join_code])

  function loadPupils() {
    supabase.rpc('get_class_pupils', { p_join_code: cls.join_code }).then(({ data }) => {
      setClassPupils(data ?? [])
    })
  }

  async function copyHubLink() {
    await navigator.clipboard.writeText(hubUrl)
    setHubCopied(true)
    setTimeout(() => setHubCopied(false), 2000)
  }

  async function copyProfileLink() {
    await navigator.clipboard.writeText(profileUrl)
    setProfileCopied(true)
    setTimeout(() => setProfileCopied(false), 2000)
  }

  async function cancelSession() {
    if (!activeSession) return
    setCancelling(true)
    await supabase.rpc('end_session', { p_session_id: activeSession.session_id })
    setActiveSession(null)
    setCancelling(false)
  }

  async function startChallenge() {
    setStarting(true)
    const { data, error } = await supabase.rpc('create_session', {
      p_class_id: cls.id,
      p_challenge_type: 'challenge',
    })
    setStarting(false)
    if (error || data?.error) {
      if (data?.error === 'weekly_challenge_used') setWeeklyUsed(true)
      return
    }
    setSession(data)
    setWeeklyUsed(true)
  }

  if (session) {
    return (
      <SessionHost
        school={school}
        cls={cls}
        session={session}
        classPupils={classPupils}
        onEnd={() => { setSession(null); setActiveSession(null) }}
      />
    )
  }

  if (view === 'pupil-detail' && selectedPupil) {
    return (
      <PupilDetail
        pupilId={selectedPupil.id}
        onBack={() => { setSelectedPupil(null); setView('pupils') }}
        onLevelChanged={loadPupils}
      />
    )
  }

  if (view === 'pupils') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="button-secondary" onClick={() => setView('main')}>← Back</button>
          <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
            <h1>Pupils</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
        </header>
        <main className="dashboard-main">
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>Class list</h2>
              <span className="section-count">{classPupils.length}</span>
            </div>
            <div className="pupil-list">
              {classPupils.map(p => (
                <button
                  key={p.id}
                  className="pupil-list-row"
                  onClick={() => { setSelectedPupil(p); setView('pupil-detail') }}
                >
                  <span className="pupil-list-name">{p.first_name} {p.last_name}</span>
                  <span className="pupil-list-arrow">›</span>
                </button>
              ))}
              {classPupils.length === 0 && (
                <p className="note">No pupils yet — use Add Pupil to share the profile link.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'hub-link') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="button-secondary" onClick={() => setView('main')}>← Back</button>
          <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
            <h1>Pupil Hub</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
        </header>
        <main className="dashboard-main">
          <section className="dashboard-section qr-focus-section">
            <p className="note" style={{ marginBottom: '1.5rem' }}>
              Display or share this so pupils can access their hub
            </p>
            <div className="qr-display-box">
              <QRCode value={hubUrl} size={220} />
            </div>
            <code className="qr-url-display">{hubDisplayUrl}</code>
            <button onClick={copyHubLink} style={{ marginTop: '1rem' }}>
              {hubCopied ? 'Copied!' : 'Copy link'}
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (view === 'add-pupil') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="button-secondary" onClick={() => setView('main')}>← Back</button>
          <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
            <h1>Add Pupil</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
        </header>
        <main className="dashboard-main">
          <section className="dashboard-section qr-focus-section">
            <p className="note" style={{ marginBottom: '1.5rem' }}>
              New pupils follow this link to create their profile
            </p>
            <div className="qr-display-box">
              <QRCode value={profileUrl} size={220} />
            </div>
            <code className="qr-url-display">{profileDisplayUrl}</code>
            <button onClick={copyProfileLink} style={{ marginTop: '1rem' }}>
              {profileCopied ? 'Copied!' : 'Copy link'}
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onChangeClass}>← Classes</button>
        <div className="dashboard-header-left" style={{ marginLeft: '1rem', flex: 1 }}>
          <h1>{cls.name}</h1>
          <span className="tier-badge">{school.name}</span>
        </div>
        <button className="button-secondary" onClick={onSignOut}>Sign out</button>
      </header>

      <main className="dashboard-tiles-wrapper">
        <div className="dashboard-brand">intuit</div>
        <div className="dashboard-tiles">

          <div className={`dashboard-tile dashboard-tile--instinct${weeklyUsed && !activeSession ? ' dashboard-tile--instinct-done' : ''}`}>
            <div className="instinct-tile-content">
              <div>
                <div className="instinct-tile-title">⚡ Instinct</div>
                <div className="instinct-tile-sub">
                  {activeSession
                    ? 'A session is waiting — resume or cancel it'
                    : weeklyUsed
                      ? 'Completed this week — resets Sunday'
                      : '60-second whole-class arithmetic challenge'}
                </div>
              </div>
              {activeSession ? (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    className="instinct-start-btn"
                    onClick={() => setSession(activeSession)}
                  >
                    Resume
                  </button>
                  <button
                    className="instinct-cancel-btn"
                    onClick={cancelSession}
                    disabled={cancelling}
                  >
                    {cancelling ? '...' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  className="instinct-start-btn"
                  onClick={startChallenge}
                  disabled={weeklyUsed || starting}
                >
                  {starting ? 'Setting up...' : weeklyUsed ? 'Done this week ✓' : 'Start Instinct'}
                </button>
              )}
            </div>
          </div>

          <button className="dashboard-tile" onClick={() => setView('hub-link')}>
            <div className="dashboard-tile-icon">🏠</div>
            <div className="dashboard-tile-title">Pupil Hub</div>
            <div className="dashboard-tile-sub">Link &amp; QR for pupils</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('add-pupil')}>
            <div className="dashboard-tile-icon">➕</div>
            <div className="dashboard-tile-title">Add Pupil</div>
            <div className="dashboard-tile-sub">Profile creator link &amp; QR</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('pupils')}>
            <div className="dashboard-tile-icon">👥</div>
            <div className="dashboard-tile-title">Pupils</div>
            <div className="dashboard-tile-sub">
              {classPupils.length} pupil{classPupils.length !== 1 ? 's' : ''}
            </div>
          </button>

        </div>
      </main>
    </div>
  )
}

export default StaffClassDashboard
