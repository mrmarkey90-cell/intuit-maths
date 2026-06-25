import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import HypePhrase from '../components/HypePhrase'
import ResultsReveal from '../components/ResultsReveal'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'
import { getActiveSubdomains, generateModuleSlots } from './domainConfig'
import InsightModule from './InsightModule'

function StreakDots({ streak }) {
  return (
    <div className="streak-dots">
      {[0, 1, 2].map(i => (
        <span key={i} className={`streak-dot ${i < streak ? 'streak-dot--filled' : ''}`} />
      ))}
    </div>
  )
}

// The real graded weekly Insight test. Calls submit_insight_attempt (not the
// practice variant) so it writes domain_results, updates pupil_subdomain_strength,
// drives level/streak progression, and populates current_missions.
function InsightGraded({ pupilId, insightLevel, avatar, onComplete }) {
  const { t, language } = useTranslation()

  const [slots, setSlots] = useState(null)
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState({})
  // Same mount-continuously pattern as InsightPractice -- InsightModule
  // generates its random question once per mount, so visibility is toggled
  // via CSS display, never by conditionally unmounting.
  const [view, setView] = useState('questions')
  const [submitResponse, setSubmitResponse] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [droppingLevel, setDroppingLevel] = useState(false)

  async function loadSlots() {
    const active = getActiveSubdomains(insightLevel)
    const { data } = await supabase.rpc('get_pupil_subdomain_strengths', { p_pupil_id: pupilId })
    const strengths = Array.isArray(data) ? data : []

    const deficits = {}
    for (const code of active) {
      const row = strengths.find(r => r.subdomain === code && r.level === insightLevel)
      deficits[code] = row ? Math.max(0, 5 - row.strength) : 0
    }

    setSlots(generateModuleSlots(insightLevel, deficits))
  }

  useEffect(() => {
    async function init() { await loadSlots() }
    init()
  }, [pupilId, insightLevel]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!slots) return (
    <div className="screen placement-test-screen">
      <p>{t('insightGraded.loading')}</p>
    </div>
  )

  const total = slots.length
  const answeredCount = Object.keys(results).length
  const correctCount = Object.values(results).filter(r => r.correct).length

  const locked = view !== 'questions'
  const revealed = view === 'review'
  const isLast = current === total - 1
  const showQuestions = view === 'questions' || view === 'review'

  const score = submitResponse?.score ?? correctCount
  const creditsEarned = submitResponse?.credits_earned ?? 0
  const levelUp = submitResponse?.level_up ?? false
  const levelDownOffer = submitResponse?.level_down_offer ?? false
  const newStage = submitResponse?.new_stage ?? insightLevel
  const newStreak = submitResponse?.new_streak ?? 0

  async function handleSubmit() {
    setView('marking')
    setSubmitError(null)
    setSubmitResponse(null)

    const modules = slots.map((subdomain, index) => ({
      subdomain,
      correct: results[index]?.correct === true,
    }))
    const { data, error } = await supabase.rpc('submit_insight_attempt', {
      p_pupil_id: pupilId,
      p_modules: modules,
    })
    if (error) setSubmitError(error.message || 'Submit failed')
    else setSubmitResponse(data)

    setTimeout(() => setView(error ? 'results' : 'reveal'), 1200)
  }

  async function handleLevelDown() {
    setDroppingLevel(true)
    await supabase.rpc('lower_insight_stage', { p_pupil_id: pupilId })
    setDroppingLevel(false)
    onComplete()
  }

  function goPrev() { setCurrent(c => Math.max(0, c - 1)) }
  function goNext() { setCurrent(c => Math.min(total - 1, c + 1)) }

  return (
    <div className="screen placement-test-screen">
      <div style={{ display: view === 'marking' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' }} className="marking-screen">
        <AvatarDisplay avatar={avatar ?? DEFAULT_AVATAR} size="clamp(140px, 36vh, 250px)" />
        <div className="marking-icon">✨</div>
        <p className="tagline">{t('insightGraded.submitting')}</p>
        <HypePhrase language={language} />
      </div>

      <div style={{ display: view === 'reveal' ? 'flex' : 'none', justifyContent: 'center' }}>
        <ResultsReveal label={t('results.envelopeLabel')} onOpen={() => setView('results')} />
      </div>

      <div style={{ display: view === 'results' ? 'block' : 'none' }}>
        {submitError ? (
          <>
            <h1>{t('insightGraded.resultsTitle')}</h1>
            <p className="error">{submitError}</p>
            <button className="results-action-btn results-action-btn--primary" onClick={onComplete}>
              {t('pupilSession.myHub')}
            </button>
          </>
        ) : (
          <>
            <div className="results-celebration-header">
              <AvatarDisplay
                avatar={avatar ?? DEFAULT_AVATAR}
                size="clamp(120px, 26vh, 180px)"
                state={levelUp ? 'celebrate' : 'wave'}
              />
              <h1 className="results-celebration-title">{t('insightGraded.resultsTitle')}</h1>
            </div>

            {levelUp && (
              <div className="level-up-banner">
                {t('insightGraded.levelUpMsg').replace('{level}', newStage)}
              </div>
            )}

            <div className="results-summary">
              <div className="stat-box stat-box--large stat-box--score">
                <div className="stat-number">✅ {score}/{total}</div>
                <div className="stat-label">{t('insightGraded.correctLabel')}</div>
              </div>
              <div className="stat-box stat-box--large stat-box--coins">
                <div className="stat-number">🪙 +{creditsEarned}</div>
                <div className="stat-label">{t('pupilHub.credits')}</div>
              </div>
            </div>

            {!levelUp && !levelDownOffer && (
              <div className="results-streak-row">
                <span className="results-streak-label">{t('insightGraded.streakLabel')}</span>
                <StreakDots streak={newStreak} />
              </div>
            )}

            {levelDownOffer && (
              <p className="level-down-prompt">{t('insightGraded.levelDownPrompt').replace('{level}', newStage - 1)}</p>
            )}

            <div className="results-action-btns">
              <button
                className="results-action-btn results-action-btn--secondary"
                onClick={() => { setCurrent(0); setView('review') }}
              >
                {t('insightGraded.check')}
              </button>
              {levelDownOffer ? (
                <>
                  <button
                    className="results-action-btn results-action-btn--secondary"
                    onClick={handleLevelDown}
                    disabled={droppingLevel}
                  >
                    {t('insightGraded.levelDownYes').replace('{level}', newStage - 1)}
                  </button>
                  <button
                    className="results-action-btn results-action-btn--primary"
                    onClick={onComplete}
                  >
                    {t('insightGraded.levelDownNo').replace('{level}', newStage)}
                  </button>
                </>
              ) : (
                <button
                  className="results-action-btn results-action-btn--primary"
                  onClick={onComplete}
                >
                  {t('pupilSession.myHub')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ display: showQuestions ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' }}>
        {view === 'review' && (
          <button className="button-secondary" onClick={() => setView('results')} style={{ marginBottom: '1rem' }}>
            {t('insightGraded.backToResults')}
          </button>
        )}

        <div className="placement-progress-track">
          <div
            className="placement-progress-fill"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>

        <div className="insight-carousel-row">
          <button className="insight-carousel-arrow" onClick={goPrev} disabled={current === 0} aria-label="Previous question">
            ←
          </button>

          <div className="insight-carousel-module-wrap">
            {slots.map((code, i) => (
              <div key={i} style={{ display: i === current ? 'block' : 'none' }}>
                <InsightModule
                  subdomain={code}
                  level={insightLevel}
                  locked={locked}
                  revealed={revealed}
                  onAnswer={result => setResults(r => ({ ...r, [i]: result }))}
                />
              </div>
            ))}
          </div>

          {view === 'questions' && isLast ? (
            <button className="insight-carousel-submit" onClick={handleSubmit} aria-label="Submit">
              ✓
            </button>
          ) : (
            <button className="insight-carousel-arrow" onClick={goNext} disabled={isLast} aria-label="Next question">
              →
            </button>
          )}
        </div>

        {view === 'questions' && isLast && (
          <span className="insight-carousel-answered-count">
            {t('insightGraded.tapToSubmit').replace('{answered}', answeredCount).replace('{total}', total)}
          </span>
        )}
      </div>
    </div>
  )
}

export default InsightGraded
