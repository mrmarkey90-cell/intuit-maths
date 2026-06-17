// Mirrors the Instinct results screen layout. This is a preview only —
// the real version will be driven by submit_insight_attempt (credits,
// level, streak) once a live pupil session exists.
function InsightResults({ score, total, onReviewMarking, onRestart }) {
  const credits = 50 + score
  const allCorrect = score === total
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 480 }}>
        <div className="page-title">
          <h1>Insight Complete</h1>
          <span className="tier-badge">Preview — no real pupil session</span>
        </div>

        <section className="dashboard-section">
          <div className="results-summary">
            <div className="stat-box stat-box--large">
              <div className="stat-number">{score}/{total}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-box stat-box--large">
              <div className="stat-number">⭐ {credits}</div>
              <div className="stat-label">Credits you'd earn</div>
            </div>
          </div>

          {allCorrect ? (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
              🎉 All correct! That's a streak tick towards the next level.
            </p>
          ) : (
            <p className="results-comparison" style={{ marginTop: '1rem', textAlign: 'center' }}>
              {pct}% this time — all {total} correct is needed to level up.
            </p>
          )}
        </section>

        <button onClick={onReviewMarking} style={{ marginTop: '0.5rem' }}>
          Look at the marking
        </button>
        <button className="button-secondary" onClick={onRestart} style={{ marginTop: '0.5rem' }}>
          Start a new test
        </button>
      </main>
    </div>
  )
}

export default InsightResults
