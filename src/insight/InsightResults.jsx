import { useTranslation } from '../i18n/LanguageContext'

// Mirrors the Instinct results screen layout. This is a preview only —
// the real version will be driven by submit_insight_attempt (credits,
// level, streak) once a live pupil session exists.
function InsightResults({ score, total, response, error, submitting, onReviewMarking, onRestart }) {
  const { t } = useTranslation()
  const credits = response?.credits_earned ?? (50 + score)
  const allCorrect = score === total
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 480 }}>
        <div className="page-title">
          <h1>{t('insight.resultsComplete')}</h1>
          <span className="tier-badge">{t('insight.previewBadge')}</span>
        </div>

        <section className="dashboard-section">
          {submitting && (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center' }}>
              {t('insight.submitting')}
            </p>
          )}
          {error && (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center', color: '#dc2626' }}>
              {t('insight.submitError').replace('{message}', error)}
            </p>
          )}

          <div className="results-summary">
            <div className="stat-box stat-box--large">
              <div className="stat-number">{score}/{total}</div>
              <div className="stat-label">{t('insight.resultsCorrectLabel')}</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">⭐ {credits}</div>
              <div className="stat-label">{t('insight.creditsYoudEarn')}</div>
            </div>
          </div>

          {allCorrect ? (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
              🎉 {t('insight.allCorrectStreak')}
            </p>
          ) : (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center' }}>
              {t('insight.pctThisTime').replace('{pct}', pct).replace('{total}', total)}
            </p>
          )}
        </section>

        <button onClick={onReviewMarking} style={{ marginTop: '0.5rem' }}>
          {t('insight.lookAtMarking')}
        </button>
        <button className="button-secondary" onClick={onRestart} style={{ marginTop: '0.5rem' }}>
          {t('insight.startNewTest')}
        </button>
      </main>
    </div>
  )
}

export default InsightResults
