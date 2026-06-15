import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function StreakDots({ streak }) {
  return (
    <div className="streak-display">
      <div className="streak-dots">
        {[0, 1, 2].map(i => (
          <span key={i} className={`streak-dot ${i < streak ? 'streak-dot--filled' : ''}`} />
        ))}
      </div>
      <span className="streak-label">
        {streak === 0 ? 'No streak yet' : `${streak}/3 towards next level`}
      </span>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PupilDetail({ pupilId, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_pupil_history', { p_pupil_id: pupilId }).then(({ data: result }) => {
      setData(result)
      setLoading(false)
    })
  }, [pupilId])

  if (loading) return <div className="dashboard"><main className="dashboard-main"><p>Loading...</p></main></div>
  if (!data?.pupil) return <div className="dashboard"><main className="dashboard-main"><p>Pupil not found.</p></main></div>

  const { pupil, attempts } = data
  const stage = pupil.current_stage ?? 1

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>{pupil.first_name} {pupil.last_name}</h1>
          <span className="tier-badge">Test Level {stage}</span>
        </div>
        <button className="button-secondary" onClick={onBack}>← Back</button>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 600 }}>
        <section className="dashboard-section">
          <div className="section-heading"><h2>Level progress</h2></div>
          <div className="pupil-detail-level">
            <div className="stat-box">
              <div className="stat-number">{stage}</div>
              <div className="stat-label">Test Level</div>
            </div>
            <div style={{ flex: 1 }}>
              <p className="note" style={{ marginBottom: '0.5rem' }}>Progress to Level {stage + 1}</p>
              <StreakDots streak={pupil.challenge_streak ?? 0} />
              <p className="note" style={{ marginTop: '0.5rem' }}>
                3 successful challenges in a row advances to the next level
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Challenge history</h2>
            <span className="section-count">{attempts.length} sessions</span>
          </div>
          {attempts.length === 0 ? (
            <p className="note">No challenge sessions completed yet.</p>
          ) : (
            <div className="history-table">
              <div className="history-row history-row--header">
                <span>Date</span>
                <span>Level</span>
                <span>Score</span>
                <span>%</span>
              </div>
              {attempts.map((a, i) => {
                const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
                const isGood = a.score >= 10
                return (
                  <div key={i} className={`history-row ${isGood ? 'history-row--good' : ''}`}>
                    <span>{formatDate(a.completed_at)}</span>
                    <span>{a.stage}</span>
                    <span>{a.score}/{a.total}</span>
                    <span>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default PupilDetail
