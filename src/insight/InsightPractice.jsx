import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import HypePhrase from '../components/HypePhrase'
import { getActiveSubdomains, generateModuleSlots } from './domainConfig'
import InsightModule from './InsightModule'

// Real pupil-facing port of InsightTest.jsx's dev-only Carousel: unlimited,
// credits-only practice (submit_insight_practice_attempt), no language
// toggle, no manual pupil-id box, no "preview" framing. Deficits are still
// derived from the pupil's real per-subdomain strength so question
// selection is meaningful, even though this practice run itself doesn't
// write any strength data back (kept strictly credits-only per instruction).
function InsightPractice({ pupilId, insightLevel, onComplete }) {
  const { t, language } = useTranslation()

  const [slots, setSlots] = useState(null)
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState({})
  // questions | marking | results | review -- IMPORTANT: every view below
  // shares one mounted JSX tree (visibility toggled via CSS display, never
  // via conditionally returning different trees), because InsightModule
  // only generates its random question once per mount -- unmounting it
  // (e.g. by early-returning a different tree for 'marking'/'results')
  // would silently regenerate fresh questions and lose every answer the
  // moment the pupil tries to review their marking.
  const [view, setView] = useState('questions')
  const [submitResponse, setSubmitResponse] = useState(null)
  const [submitError, setSubmitError] = useState(null)

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
      <p>{t('insightPractice.loading')}</p>
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
  const creditsEarned = submitResponse?.credits_earned ?? correctCount
  const prevScore = submitResponse?.prev_score
  const prevTotal = submitResponse?.prev_total
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  // Always against the last GRADED insight result, never a practice one --
  // same rule as Instinct's existing comparison (PupilSession.jsx).
  let comparison = null
  if (prevScore != null && prevTotal > 0) {
    const prevPct = Math.round((prevScore / prevTotal) * 100)
    const diff = pct - prevPct
    comparison = diff > 0
      ? t('pupilSession.fromLastTimeUp').replace('{n}', diff)
      : diff < 0
        ? t('pupilSession.fromLastTimeDown').replace('{n}', diff)
        : t('pupilSession.sameAsLastTime')
  }

  async function handleSubmit() {
    setView('marking')
    setSubmitError(null)
    setSubmitResponse(null)

    const modules = slots.map((subdomain, index) => ({
      subdomain,
      correct: results[index]?.correct === true,
    }))
    const { data, error } = await supabase.rpc('submit_insight_practice_attempt', {
      p_pupil_id: pupilId,
      p_modules: modules,
    })
    if (error) setSubmitError(error.message || 'Submit failed')
    else setSubmitResponse(data)

    setTimeout(() => setView('results'), 1200)
  }

  function goPrev() { setCurrent(c => Math.max(0, c - 1)) }
  function goNext() { setCurrent(c => Math.min(total - 1, c + 1)) }

  function handleRetry() {
    setSlots(null)
    setCurrent(0)
    setResults({})
    setSubmitResponse(null)
    setSubmitError(null)
    setView('questions')
    loadSlots()
  }

  return (
    <div className="screen placement-test-screen">
      <div style={{ display: view === 'marking' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' }} className="marking-screen">
        <div className="marking-icon">✨</div>
        <p className="tagline">{t('insightPractice.submitting')}</p>
        <HypePhrase language={language} />
      </div>

      <div style={{ display: view === 'results' ? 'block' : 'none' }}>
        <h1>{t('insightPractice.resultsTitle')}</h1>
        {submitError ? (
          <p className="error">{submitError}</p>
        ) : (
          <>
            <div className="results-summary">
              <div className="stat-box stat-box--large">
                <div className="stat-number">{score}/{total}</div>
                <div className="stat-label">{t('insightPractice.correctLabel')}</div>
              </div>
              <div className="stat-box stat-box--large">
                <div className="stat-number">+{creditsEarned}</div>
                <div className="stat-label">{t('pupilHub.credits')}</div>
              </div>
            </div>
            {comparison && <p className="results-comparison">{comparison}</p>}
          </>
        )}
        <div className="insight-practice-results-btns">
          <button
            className="insight-practice-results-btn insight-practice-results-btn--secondary"
            onClick={() => { setCurrent(0); setView('review') }}
          >
            {t('insightPractice.check')}
          </button>
          <button
            className="insight-practice-results-btn insight-practice-results-btn--secondary"
            onClick={handleRetry}
          >
            {t('insightPractice.retry')}
          </button>
          <button
            className="insight-practice-results-btn insight-practice-results-btn--primary"
            onClick={onComplete}
          >
            {t('pupilSession.myHub')}
          </button>
        </div>
      </div>

      <div style={{ display: showQuestions ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' }}>
        {view === 'review' && (
          <button className="button-secondary" onClick={() => setView('results')} style={{ marginBottom: '1rem' }}>
            {t('insightPractice.backToResults')}
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
            {t('insightPractice.tapToSubmit').replace('{answered}', answeredCount).replace('{total}', total)}
          </span>
        )}
      </div>
    </div>
  )
}

export default InsightPractice
