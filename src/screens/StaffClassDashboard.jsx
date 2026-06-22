import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SessionHost from './session/SessionHost'
import PupilDetail from './PupilDetail'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'

// The random-pupil-picker highlights a fresh uniformly-random pupil on each
// tick (never the same one twice in a row) rather than sweeping through the
// grid in order -- ticks are still scheduled by requestAnimationFrame against
// an eased position over a fixed wall-clock duration, so the *cadence* ramps
// up then down smoothly (ease-in-out-sine's velocity is a single sine hump
// over the run), even though *which* card lights up each tick is unrelated
// to the previous one. The final tick is forced to the chosen pupil and held
// highlighted for PICKER_REVEAL_DELAY_MS before the reveal tile appears, so
// the highlight and the reveal visibly agree instead of the highlight
// clearing in the same instant the popup opens.
const PICKER_DURATION_MS = 3200
const PICKER_TOTAL_TICKS = 28
const PICKER_REVEAL_DELAY_MS = 600

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
  const pickRafRef = useRef(null)
  const pickRevealTimeoutRef = useRef(null)
  const audioCtxRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pickRafRef.current) cancelAnimationFrame(pickRafRef.current)
      if (pickRevealTimeoutRef.current) clearTimeout(pickRevealTimeoutRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

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

  function playHighlightTone() {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 660
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.09)
    } catch {
      // Web Audio unavailable/blocked -- the visual highlight still works without sound.
    }
  }

  function pickRandomPupil() {
    const pupils = classPupilsRef.current
    const length = pupils.length
    if (picking || length === 0) return
    setPickedPupil(null)

    if (length === 1) {
      setPickedPupil(pupils[0])
      return
    }

    setPicking(true)
    const finalPupil = pupils[Math.floor(Math.random() * length)]
    const start = performance.now()
    let lastTick = -1
    let lastShownId = null

    function pickDifferentId() {
      let candidate
      do {
        candidate = pupils[Math.floor(Math.random() * length)]
      } while (candidate.id === lastShownId)
      return candidate.id
    }

    function frame(now) {
      const t = Math.min((now - start) / PICKER_DURATION_MS, 1)
      const eased = 0.5 * (1 - Math.cos(Math.PI * t)) // ease-in-out-sine: velocity ramps up then down
      const tick = Math.min(Math.floor(eased * PICKER_TOTAL_TICKS), PICKER_TOTAL_TICKS)
      if (tick !== lastTick) {
        lastTick = tick
        const id = t >= 1 ? finalPupil.id : pickDifferentId()
        lastShownId = id
        setHighlightedId(id)
        playHighlightTone()
      }
      if (t < 1) {
        pickRafRef.current = requestAnimationFrame(frame)
      } else {
        pickRevealTimeoutRef.current = setTimeout(() => {
          setPicking(false)
          setHighlightedId(null)
          setPickedPupil(finalPupil)
        }, PICKER_REVEAL_DELAY_MS)
      }
    }
    pickRafRef.current = requestAnimationFrame(frame)
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
            </section>

            <section className="dashboard-section class-list-grid-col">
              <div className="section-heading">
                <h2>{t('staffDashboard.classList')}</h2>
                <div className="class-list-heading-actions">
                  <button
                    className="pick-pupil-btn"
                    onClick={pickRandomPupil}
                    disabled={picking || classPupils.length === 0}
                  >
                    🎲 {t('staffDashboard.pickRandomPupil')}
                  </button>
                  <span className="section-count">{classPupils.length}</span>
                </div>
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
