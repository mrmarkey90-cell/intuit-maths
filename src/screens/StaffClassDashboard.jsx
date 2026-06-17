import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SessionHost from './session/SessionHost'
import PupilDetail from './PupilDetail'

function StaffClassDashboard({ school, cls, onChangeClass, onSignOut }) {
  const { t } = useTranslation()
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
          <button className="button-secondary" onClick={() => setView('main')}>← {t('common.back')}</button>
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        </header>
        <main className="dashboard-main">
          <div className="page-title">
            <h1>{t('staffDashboard.pupilsTitle')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>{t('staffDashboard.classList')}</h2>
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
                <p className="note">{t('staffDashboard.noPupilsYet')}</p>
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
          <button className="button-secondary" onClick={() => setView('main')}>← {t('common.back')}</button>
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        </header>
        <main className="dashboard-main">
          <div className="page-title">
            <h1>{t('staffDashboard.pupilHubTitle')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <section className="dashboard-section qr-focus-section">
            <p className="note" style={{ marginBottom: '1.5rem' }}>
              {t('staffDashboard.displayOrShare')}
            </p>
            <div className="qr-display-box">
              <QRCode value={hubUrl} size={220} />
            </div>
            <code className="qr-url-display">{hubDisplayUrl}</code>
            <button onClick={copyHubLink} style={{ marginTop: '1rem' }}>
              {hubCopied ? t('common.copied') : t('staffDashboard.copyLink')}
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
          <button className="button-secondary" onClick={() => setView('main')}>← {t('common.back')}</button>
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        </header>
        <main className="dashboard-main">
          <div className="page-title">
            <h1>{t('staffDashboard.addPupilTitle')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <section className="dashboard-section qr-focus-section">
            <p className="note" style={{ marginBottom: '1.5rem' }}>
              {t('staffDashboard.newPupilsFollow')}
            </p>
            <div className="qr-display-box">
              <QRCode value={profileUrl} size={220} />
            </div>
            <code className="qr-url-display">{profileDisplayUrl}</code>
            <button onClick={copyProfileLink} style={{ marginTop: '1rem' }}>
              {profileCopied ? t('common.copied') : t('staffDashboard.copyLink')}
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onChangeClass}>← {t('staffDashboard.classes')}</button>
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        <button className="button-secondary" onClick={onSignOut}>{t('common.signOut')}</button>
      </header>

      <main className="dashboard-tiles-wrapper">
        <div className="dashboard-brand">{cls.name} — {school.name}</div>
        <div className="dashboard-tiles">

          <div className={`dashboard-tile dashboard-tile--instinct${weeklyUsed && !activeSession ? ' dashboard-tile--instinct-done' : ''}`}>
            <div className="instinct-tile-content">
              <div>
                <div className="instinct-tile-title">⚡ Instinct</div>
                <div className="instinct-tile-sub">
                  {activeSession
                    ? t('staffDashboard.sessionWaiting')
                    : weeklyUsed
                      ? t('staffDashboard.completedThisWeek')
                      : t('staffDashboard.challengeDescription')}
                </div>
              </div>
              {activeSession ? (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    className="instinct-start-btn"
                    onClick={() => setSession(activeSession)}
                  >
                    {t('staffDashboard.resume')}
                  </button>
                  <button
                    className="instinct-cancel-btn"
                    onClick={cancelSession}
                    disabled={cancelling}
                  >
                    {cancelling ? '...' : t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  className="instinct-start-btn"
                  onClick={startChallenge}
                  disabled={weeklyUsed || starting}
                >
                  {starting ? t('staffDashboard.settingUp') : weeklyUsed ? t('staffDashboard.doneThisWeek') : t('staffDashboard.startInstinct')}
                </button>
              )}
            </div>
          </div>

          <button className="dashboard-tile" onClick={() => setView('hub-link')}>
            <div className="dashboard-tile-icon">🏠</div>
            <div className="dashboard-tile-title">{t('staffDashboard.pupilHubTitle')}</div>
            <div className="dashboard-tile-sub">{t('staffDashboard.pupilHubSub')}</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('add-pupil')}>
            <div className="dashboard-tile-icon">➕</div>
            <div className="dashboard-tile-title">{t('staffDashboard.addPupilTitle')}</div>
            <div className="dashboard-tile-sub">{t('staffDashboard.addPupilSub')}</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('pupils')}>
            <div className="dashboard-tile-icon">👥</div>
            <div className="dashboard-tile-title">{t('staffDashboard.pupilsTitle')}</div>
            <div className="dashboard-tile-sub">
              {t('dashboard.pupilsCount').replace('{n}', classPupils.length)}
            </div>
          </button>

        </div>
      </main>
    </div>
  )
}

export default StaffClassDashboard
