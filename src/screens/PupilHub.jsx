import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'
import PlacementTest from '../insight/PlacementTest'
import InsightPractice from '../insight/InsightPractice'
import GamesHub from '../games/GamesHub'
import Pelmanism from '../games/Pelmanism'
import PupilVerification from '../components/PupilVerification'
import PupilProfileCreate from './PupilProfileCreate'
import SecurityQuestionsSetup from '../components/SecurityQuestionsSetup'

function StreakDots({ streak }) {
  return (
    <div className="streak-display">
      <div className="streak-dots">
        {[0, 1, 2].map(i => (
          <span key={i} className={`streak-dot ${i < streak ? 'streak-dot--filled' : ''}`} />
        ))}
      </div>
    </div>
  )
}

function PupilHub({ joinCode }) {
  const navigate = useNavigate()
  const { t, setLanguage } = useTranslation()

  const [view, setView] = useState('loading')
  const [classInfo, setClassInfo] = useState(null)
  const [pupils, setPupils] = useState([])
  const [pendingPupil, setPendingPupil] = useState(null)
  const [pupil, setPupil] = useState(null)
  const [practicing, setPracticing] = useState(false)
  const [practiceExpanded, setPracticeExpanded] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: info }, { data: pupilList }] = await Promise.all([
        supabase.rpc('get_class_by_join_code', { p_join_code: joinCode }),
        supabase.rpc('get_class_pupils', { p_join_code: joinCode }),
      ])
      if (!info) { setView('error'); return }
      setClassInfo(info)
      if (info.language) setLanguage(info.language)
      setPupils(pupilList ?? [])

      // Returning from practice in the same browser session — skip re-selection
      const storedId = sessionStorage.getItem(`hub_pupil_${joinCode}`)
      if (storedId) {
        const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: storedId })
        if (data?.pupil) {
          setPupil(data.pupil)
          setView(data.pupil.placement_complete ? 'hub' : 'placement_prompt')
          return
        }
        sessionStorage.removeItem(`hub_pupil_${joinCode}`)
      }

      setView('select')
    }
    init()
  }, [joinCode, setLanguage])

  async function confirmPupil(p) {
    const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: p.id })
    if (!data?.pupil) { setView('error'); return }
    setPupil(data.pupil)
    sessionStorage.setItem(`hub_pupil_${joinCode}`, p.id)
    setView(data.pupil.placement_complete ? 'hub' : 'placement_prompt')
  }

  async function handlePlacementComplete() {
    const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupil.id })
    if (data?.pupil) setPupil(data.pupil)
    setView('hub')
  }

  function handleProfileCreated(newPupil) {
    // Confirms who this pupil is (just created their profile this very
    // session) -- seed the same "skip re-selection" shortcut the tile-tap
    // path uses, so reloading mid-setup doesn't bounce them back to the
    // tile grid.
    sessionStorage.setItem(`hub_pupil_${joinCode}`, newPupil.id)
    setPupil(newPupil)
    setView('security_setup')
  }

  async function handleInsightPracticeComplete() {
    const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupil.id })
    if (data?.pupil) setPupil(data.pupil)
    setPracticeExpanded(false)
    setView('hub')
  }

  async function handlePelmanismComplete() {
    const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupil.id })
    if (data?.pupil) setPupil(data.pupil)
    setView('hub')
  }

  async function startPractice() {
    if (practicing || !classInfo?.class_id || !pupil?.id) return
    setPracticing(true)
    const { data: sessionCode, error } = await supabase.rpc('create_practice_session', {
      p_class_id: classInfo.class_id,
      p_pupil_id: pupil.id,
    })
    setPracticing(false)
    if (error || !sessionCode) return
    navigate(`/${sessionCode}?pupil=${pupil.id}`)
  }

  if (view === 'loading') return <div className="screen"><p>{t('common.loading')}</p></div>

  if (view === 'error') return (
    <div className="screen">
      <h1>{t('pupilHub.classNotFound')}</h1>
      <p className="tagline">{t('pupilHub.askTeacher')}</p>
    </div>
  )

  if (view === 'select') return (
    <div className="screen">
      <h1>{t('pupilHub.whoAreYou')}</h1>
      <p className="tagline">{classInfo?.class_name}</p>
      <div className="pupil-grid">
        {pupils.map(p => (
          <button
            key={p.id}
            className="pupil-tile"
            onClick={() => { setPendingPupil(p); setView('confirm') }}
          >
            <AvatarDisplay avatar={p.avatar ?? DEFAULT_AVATAR} size={56} />
            <span className="pupil-tile-name">{p.first_name}</span>
            <span className="pupil-tile-surname">{p.last_name}</span>
          </button>
        ))}
      </div>
      <button
        className="button-secondary"
        style={{ marginTop: '1rem' }}
        onClick={() => setView('create_profile')}
      >
        {t('pupilHub.imNewHere')}
      </button>
    </div>
  )

  if (view === 'create_profile') return (
    <PupilProfileCreate joinCode={joinCode} classInfo={classInfo} onComplete={handleProfileCreated} />
  )

  if (view === 'security_setup') return (
    <SecurityQuestionsSetup pupilId={pupil.id} onComplete={() => setView('placement')} />
  )

  if (view === 'confirm') return (
    <PupilVerification
      pupilId={pendingPupil.id}
      onVerified={() => confirmPupil(pendingPupil)}
      onBack={() => { setPendingPupil(null); setView('select') }}
    />
  )

  if (view === 'placement_prompt') return (
    <div className="screen hub-confirm">
      <AvatarDisplay avatar={pupil?.avatar ?? DEFAULT_AVATAR} size={100} />
      <h1>{t('pupilHub.placementPromptTitle')}</h1>
      <p className="tagline">{t('pupilHub.placementPromptBody')}</p>
      <button onClick={() => setView('placement')}>{t('pupilHub.placementPromptStart')}</button>
    </div>
  )

  if (view === 'placement') {
    return <PlacementTest pupilId={pupil.id} onComplete={handlePlacementComplete} />
  }

  if (view === 'insight_practice') {
    return (
      <InsightPractice
        pupilId={pupil.id}
        insightLevel={pupil.insight_level ?? 1}
        avatar={pupil.avatar}
        onComplete={handleInsightPracticeComplete}
      />
    )
  }

  if (view === 'games') {
    return <GamesHub onSelect={id => setView(id)} onBack={() => setView('hub')} />
  }

  if (view === 'pelmanism') {
    return (
      <Pelmanism
        pupilId={pupil.id}
        instinctLevel={pupil.instinct_level ?? 1}
        avatar={pupil.avatar}
        onComplete={handlePelmanismComplete}
      />
    )
  }

  if (view === 'hub') {
    const instinctStreak = pupil.challenge_streak ?? 0
    const insightStreak = pupil.insight_streak ?? 0
    const instinctLevel = pupil.instinct_level ?? 1
    const insightLevel = pupil.insight_level ?? 1

    return (
      <div className="hub-screen hub-screen--split">
        <div className="hub-status-panel">
          <div className="hub-avatar-block">
            <AvatarDisplay
              avatar={pupil.avatar ?? DEFAULT_AVATAR}
              size="clamp(80px, 20vh, 150px)"
            />
          </div>

          <h1 className="hub-name">{t('pupilHub.hi').replace('{name}', pupil.first_name)}</h1>

          <div className="hub-credits">⭐ {pupil.credits ?? 0} {t('pupilHub.credits')}</div>

          <div className="hub-progress-row">
            <div className="hub-progress-box hub-progress-box--instinct">
              <span className="hub-progress-label">Instinct</span>
              <span className="hub-progress-level">{instinctLevel}</span>
              <StreakDots streak={instinctStreak} />
            </div>
            <div className="hub-progress-box hub-progress-box--insight">
              <span className="hub-progress-label">Insight</span>
              <span className="hub-progress-level">{insightLevel}</span>
              <StreakDots streak={insightStreak} />
            </div>
          </div>

          <button className="hub-wardrobe-btn" disabled>
            <span className="hub-wardrobe-icon">👕</span>
            {t('pupilHub.wardrobe')}
            <span className="hub-wardrobe-badge">{t('pupilHub.comingSoon')}</span>
          </button>

          <button
            className="button-secondary hub-signout-btn"
            onClick={() => {
              sessionStorage.removeItem(`hub_pupil_${joinCode}`)
              setPupil(null)
              setView('select')
            }}
          >
            {t('pupilHub.notYouSignOut').replace('{name}', pupil.first_name)}
          </button>
        </div>

        <div className="hub-areas-panel">
          <button className="hub-area-tile hub-area-tile--missions" disabled>
            <span className="hub-area-tile-icon">🎯</span>
            <span className="hub-area-tile-label">{t('pupilHub.specialMissions')}</span>
            <span className="hub-area-tile-badge">{t('pupilHub.comingSoon')}</span>
          </button>

          <button className="hub-area-tile hub-area-tile--games" onClick={() => setView('games')}>
            <span className="hub-area-tile-icon">🎮</span>
            <span className="hub-area-tile-label">{t('pupilHub.games')}</span>
          </button>

          {practiceExpanded ? (
            <div className="hub-area-tile hub-area-tile--practise hub-area-tile--practise-expanded">
              <button
                className="hub-tile-collapse-btn"
                onClick={() => setPracticeExpanded(false)}
                aria-label="Close"
              >
                ×
              </button>
              <button className="hub-practice-option" onClick={startPractice} disabled={practicing}>
                {practicing ? t('pupilHub.startingPractice') : t('pupilHub.practiceChoiceInstinct')}
              </button>
              <button className="hub-practice-option" onClick={() => setView('insight_practice')}>
                {t('pupilHub.practiceChoiceInsight')}
              </button>
            </div>
          ) : (
            <button
              className="hub-area-tile hub-area-tile--practise"
              onClick={() => setPracticeExpanded(true)}
            >
              <span className="hub-area-tile-icon">⚡</span>
              <span className="hub-area-tile-label">{t('pupilHub.practise')}</span>
            </button>
          )}

          <button className="hub-intoit-cta" disabled>
            <span className="hub-intoit-icon">🏰</span>
            <span className="hub-intoit-label">{t('pupilHub.intoIt')}</span>
            <span className="hub-intoit-badge">{t('pupilHub.comingSoon')}</span>
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default PupilHub
