import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SessionHost from './session/SessionHost'
import PupilDetail from './PupilDetail'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'

// Speed of the random-pupil-picker's card-to-card cycling follows a sine
// curve across the run: slow to start, fastest at the midpoint, slow again
// as it lands on the chosen pupil -- a simple ramp-up-then-down "wheel spin"
// feel rather than a constant tick rate.
const PICKER_STEPS = 26
const PICKER_MIN_DELAY = 70
const PICKER_MAX_DELAY = 320

function StaffClassDashboard({ school, cls, onChangeClass, onSignOut }) {
  const { t } = useTranslation()
  const [view, setView] = useState('main')
  const [session, setSession] = useState(null)       // actively shown in SessionHost
  const [activeSession, setActiveSession] = useState(null) // in DB but not yet resumed
  const [weeklyUsed, setWeeklyUsed] = useState(false)
  const [classPupils, setClassPupils] = useState([])
  const [unallocatedPupils, setUnallocatedPupils] = useState([])
  const [claimingId, setClaimingId] = useState(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [selectedPupil, setSelectedPupil] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [highlightedId, setHighlightedId] = useState(null)
  const [picking, setPicking] = useState(false)
  const [pickedPupil, setPickedPupil] = useState(null)
  const classPupilsRef = useRef(classPupils)
  classPupilsRef.current = classPupils

  // One link covers both new and returning pupils now -- PupilHub itself
  // offers an "I'm new here" entry point for profile creation.
  const pupilUrl = `https://intuited.uk/${cls.join_code}`
  const pupilDisplayUrl = `intuited.uk/${cls.join_code}`

  async function refreshSessionStatus() {
    const { data } = await supabase.rpc('get_class_session_status', { p_class_id: cls.id })
    if (!data) return
    setWeeklyUsed(data.weekly_used)
    setActiveSession(data.active_session ?? null)
  }

  useEffect(() => {
    async function init() { await refreshSessionStatus() }
    init()
    loadPupils()
  }, [cls.id, cls.join_code]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view === 'add-pupil') loadUnallocated()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadPupils() {
    supabase.rpc('get_class_pupils', { p_join_code: cls.join_code }).then(({ data }) => {
      setClassPupils(data ?? [])
    })
  }

  function loadUnallocated() {
    supabase.rpc('get_unallocated_pupils', { p_school_id: school.id }).then(({ data }) => {
      setUnallocatedPupils(data ?? [])
    })
  }

  async function handleClaim(pupilId) {
    setClaimingId(pupilId)
    const { data } = await supabase.rpc('claim_pupil_for_class', { p_pupil_id: pupilId, p_class_id: cls.id })
    if (data?.ok) {
      setUnallocatedPupils(prev => prev.filter(p => p.id !== pupilId))
      loadPupils()
    }
    setClaimingId(null)
  }

  async function copyPupilLink() {
    await navigator.clipboard.writeText(pupilUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function awardCoin(pupilId) {
    setClassPupils(prev => prev.map(p => p.id === pupilId ? { ...p, credits: (p.credits ?? 0) + 1 } : p))
    const { data } = await supabase.rpc('award_credit', { p_pupil_id: pupilId })
    if (data?.credits != null) {
      setClassPupils(prev => prev.map(p => p.id === pupilId ? { ...p, credits: data.credits } : p))
    }
  }

  function pickRandomPupil() {
    const pupils = classPupilsRef.current
    if (picking || pupils.length === 0) return
    setPickedPupil(null)
    setPicking(true)
    const finalPupil = pupils[Math.floor(Math.random() * pupils.length)]

    let step = 0
    function tick() {
      const isLastStep = step === PICKER_STEPS
      const candidate = isLastStep
        ? finalPupil
        : pupils[Math.floor(Math.random() * pupils.length)]
      setHighlightedId(candidate.id)

      if (isLastStep) {
        setPicking(false)
        setHighlightedId(null)
        setPickedPupil(finalPupil)
        return
      }

      const progress = step / PICKER_STEPS
      const speedFactor = Math.sin(progress * Math.PI) // 0 -> 1 -> 0
      const delay = PICKER_MAX_DELAY - (PICKER_MAX_DELAY - PICKER_MIN_DELAY) * speedFactor
      step += 1
      setTimeout(tick, delay)
    }
    tick()
  }

  async function cancelSession() {
    if (!activeSession) return
    setCancelling(true)
    await supabase.rpc('end_session', { p_session_id: activeSession.session_id })
    await refreshSessionStatus()
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
    // Creating the lobby session does not mean the weekly Instinct slot is
    // used -- that only becomes true once the teacher actually presses
    // Begin (started_at gets set). Don't optimistically flip this here.
    setSession(data)
  }

  if (session) {
    return (
      <SessionHost
        school={school}
        cls={cls}
        session={session}
        classPupils={classPupils}
        onEnd={() => { setSession(null); refreshSessionStatus() }}
      />
    )
  }

  if (view === 'pupil-detail' && selectedPupil) {
    return (
      <PupilDetail
        pupilId={selectedPupil.id}
        onBack={() => { setSelectedPupil(null); setView('class-list') }}
        onLevelChanged={loadPupils}
      />
    )
  }

  if (view === 'class-list') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="button-secondary" onClick={() => setView('main')}>← {t('common.back')}</button>
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        </header>
        <main className="class-list-main">
          <div className="page-title">
            <h1>{t('staffDashboard.classList')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <div className="class-list-body">
            <section className="dashboard-section class-list-hub-col">
              <h2>{t('staffDashboard.pupilHubTitle')}</h2>
              <p className="note">{t('staffDashboard.displayOrShare')}</p>
              <div className="qr-display-box qr-display-box--compact">
                <QRCode value={pupilUrl} size={150} />
              </div>
              <code className="qr-url-display qr-url-display--compact">{pupilDisplayUrl}</code>
              <button className="button-secondary" onClick={copyPupilLink}>
                {linkCopied ? t('common.copied') : t('staffDashboard.copyLink')}
              </button>
              <button
                className="pick-pupil-btn"
                onClick={pickRandomPupil}
                disabled={picking || classPupils.length === 0}
              >
                🎲 {t('staffDashboard.pickRandomPupil')}
              </button>
            </section>

            <section className="dashboard-section class-list-grid-col">
              <div className="section-heading">
                <h2>{t('staffDashboard.classList')}</h2>
                <span className="section-count">{classPupils.length}</span>
              </div>
              {classPupils.length === 0 ? (
                <p className="note">{t('staffDashboard.noPupilsYet')}</p>
              ) : (
                <div className="coin-grid">
                  {classPupils.map(p => (
                    <div
                      key={p.id}
                      className={`coin-card${highlightedId === p.id ? ' coin-card--highlight' : ''}`}
                    >
                      <button
                        className="coin-card-main"
                        onClick={() => { setSelectedPupil(p); setView('pupil-detail') }}
                      >
                        <AvatarDisplay avatar={p.avatar ?? DEFAULT_AVATAR} size={56} />
                        <span className="coin-card-name">{p.first_name}</span>
                      </button>
                      <button
                        className="coin-card-coin-btn"
                        onClick={(e) => { e.stopPropagation(); awardCoin(p.id) }}
                      >
                        🪙 {p.credits ?? 0}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button-secondary"
                style={{ marginTop: '0.75rem' }}
                onClick={() => setView('add-pupil')}
              >
                {t('staffDashboard.addPupilButton')}
              </button>
            </section>
          </div>
        </main>

        {pickedPupil && (
          <div className="random-pick-overlay" onClick={() => setPickedPupil(null)}>
            <div className="random-pick-tile">
              <AvatarDisplay avatar={pickedPupil.avatar ?? DEFAULT_AVATAR} size={150} />
              <h2>{pickedPupil.first_name} {pickedPupil.last_name}</h2>
              <button className="button-secondary" onClick={() => setPickedPupil(null)}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (view === 'add-pupil') {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="button-secondary" onClick={() => setView('class-list')}>← {t('common.back')}</button>
          <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
        </header>
        <main className="dashboard-main">
          <div className="page-title">
            <h1>{t('staffDashboard.addPupilTitle')}</h1>
            <span className="tier-badge">{cls.name}</span>
          </div>
          <p className="note" style={{ marginBottom: '1rem' }}>
            {t('staffDashboard.newPupilsFollow')}
          </p>

          <section className="dashboard-section">
            <div className="section-heading">
              <h2>{t('staffDashboard.unallocatedPupils')}</h2>
              <span className="section-count">{unallocatedPupils.length}</span>
            </div>
            {unallocatedPupils.length === 0 ? (
              <p className="note">{t('staffDashboard.noUnallocatedPupils')}</p>
            ) : (
              <div className="pupil-list">
                {unallocatedPupils.map(p => (
                  <div key={p.id} className="pupil-list-row">
                    <span className="pupil-list-name">{p.first_name} {p.last_name}</span>
                    <button
                      className="button-secondary"
                      onClick={() => handleClaim(p.id)}
                      disabled={claimingId === p.id}
                      style={{ padding: '4px 10px', fontSize: '13px' }}
                    >
                      {claimingId === p.id ? t('staffDashboard.claiming') : t('staffDashboard.claim')}
                    </button>
                  </div>
                ))}
              </div>
            )}
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

          <button className="dashboard-tile" onClick={() => setView('class-list')}>
            <div className="dashboard-tile-icon">👥</div>
            <div className="dashboard-tile-title">{t('staffDashboard.classList')}</div>
            <div className="dashboard-tile-sub">
              {t('dashboard.pupilsCount').replace('{n}', classPupils.length)}
            </div>
          </button>

          <button className="dashboard-tile dashboard-tile--signout" onClick={onSignOut}>
            <div className="dashboard-tile-icon">🚪</div>
            <div className="dashboard-tile-title">{t('common.signOut')}</div>
          </button>

        </div>
      </main>
    </div>
  )
}

export default StaffClassDashboard
