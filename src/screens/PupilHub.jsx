import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'
import PlacementTest from '../insight/PlacementTest'
import InsightPractice from '../insight/InsightPractice'

function StreakDots({ streak, t }) {
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

function PupilHub() {
  const { joinCode } = useParams()
  const navigate = useNavigate()
  const { t, setLanguage } = useTranslation()

  const [view, setView] = useState('loading')
  const [classInfo, setClassInfo] = useState(null)
  const [pupils, setPupils] = useState([])
  const [pendingPupil, setPendingPupil] = useState(null)
  const [pupil, setPupil] = useState(null)
  const [avatarMsg, setAvatarMsg] = useState(false)
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
  }, [joinCode])

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

  async function handleInsightPracticeComplete() {
    const { data } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupil.id })
    if (data?.pupil) setPupil(data.pupil)
    setPracticeExpanded(false)
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
    navigate(`/play/${sessionCode}?pupil=${pupil.id}&hub=${joinCode}`)
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
    </div>
  )

  if (view === 'confirm') return (
    <div className="screen hub-confirm">
      <AvatarDisplay
        avatar={pendingPupil?.avatar ?? DEFAULT_AVATAR}
        size={100}
      />
      <p className="hub-confirm-question">{t('pupilHub.isThisYou')}</p>
      <p className="hub-confirm-name">{pendingPupil?.first_name} {pendingPupil?.last_name}</p>
      <div className="hub-confirm-btns">
        <button onClick={() => confirmPupil(pendingPupil)}>{t('pupilHub.yesThatsMe')}</button>
        <button
          className="button-secondary"
          onClick={() => { setPendingPupil(null); setView('select') }}
        >
          {t('pupilHub.notMe')}
        </button>
      </div>
    </div>
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
        onComplete={handleInsightPracticeComplete}
      />
    )
  }

  if (view === 'hub') {
    const streak = pupil.challenge_streak ?? 0
    const instinctLevel = pupil.instinct_level ?? 1
    const insightLevel = pupil.insight_level ?? 1

    return (
      <div className="hub-screen hub-screen--split">
        <div className="hub-status-panel">
          <div className="hub-avatar-block" onClick={() => setAvatarMsg(v => !v)}>
            <AvatarDisplay
              avatar={pupil.avatar ?? DEFAULT_AVATAR}
              size={64}
            />
            <span className="hub-avatar-label">{avatarMsg ? t('pupilHub.comingSoon') : t('pupilHub.editAvatar')}</span>
          </div>

          <h1 className="hub-name">{t('pupilHub.hi').replace('{name}', pupil.first_name)}</h1>

          <div className="hub-levels">
            <div className="hub-level-badge hub-level-badge--instinct">
              <span className="hub-level-badge-label">Instinct</span>
              <span className="hub-level-badge-number">{instinctLevel}</span>
            </div>
            <div className="hub-level-badge hub-level-badge--insight">
              <span className="hub-level-badge-label">Insight</span>
              <span className="hub-level-badge-number">{insightLevel}</span>
            </div>
          </div>

          <div className="hub-credits">⭐ {pupil.credits ?? 0} {t('pupilHub.credits')}</div>

          <div className="hub-streak-block">
            <StreakDots streak={streak} t={t} />
            <span className="streak-label">
              {streak > 0
                ? t('pupilHub.streakTowardsInstinctLevel').replace('{streak}', streak).replace('{n}', instinctLevel + 1)
                : t('pupilHub.towardsInstinctLevel').replace('{n}', instinctLevel + 1)}
            </span>
          </div>

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

          <button className="hub-area-tile hub-area-tile--games" disabled>
            <span className="hub-area-tile-icon">🎮</span>
            <span className="hub-area-tile-label">{t('pupilHub.games')}</span>
            <span className="hub-area-tile-badge">{t('pupilHub.comingSoon')}</span>
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
