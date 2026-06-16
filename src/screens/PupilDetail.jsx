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

function ScoreChart({ attempts }) {
  if (attempts.length === 0) return null

  const sorted = [...attempts].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))

  const W = 560
  const H = 220
  const PAD = { top: 52, right: 24, bottom: 36, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxScore = Math.ceil(Math.max(...sorted.map(a => a.score), 10) / 5) * 5

  // Y grid lines at every 5
  const gridLines = []
  for (let v = 0; v <= maxScore; v += 5) gridLines.push(v)

  const pts = sorted.map((a, i) => {
    const x = PAD.left + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW)
    const y = PAD.top + innerH - (a.score / maxScore) * innerH
    const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
    const date = new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { x, y, pct, date, stage: a.stage, score: a.score, good: a.score >= 10 }
  })

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid lines */}
      {gridLines.map(v => {
        const y = PAD.top + innerH - (v / maxScore) * innerH
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{v}</text>
          </g>
        )
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />

      {/* Y axis label */}
      <text
        x={10} y={PAD.top + innerH / 2}
        textAnchor="middle" fontSize="11" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.top + innerH / 2})`}
      >Correct</text>

      {/* Line */}
      {pts.length > 1 && (
        <path d={linePath} fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          {/* Level label */}
          <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4f46e5">
            L{p.stage}
          </text>
          {/* % label */}
          <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="11" fill="#6b7280">
            {p.pct}%
          </text>
          {/* Dot */}
          <circle
            cx={p.x} cy={p.y} r="6"
            fill={p.good ? '#4f46e5' : '#a78bfa'}
            stroke="white" strokeWidth="2"
          />
          {/* X axis date */}
          <text x={p.x} y={PAD.top + innerH + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {p.date}
          </text>
        </g>
      ))}
    </svg>
  )
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

      <main className="dashboard-main" style={{ maxWidth: 640 }}>
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
                3 successful Instinct sessions in a row (10+ correct) advances to the next level
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Instinct history</h2>
            <span className="section-count">{attempts.length} sessions</span>
          </div>
          {attempts.length === 0 ? (
            <p className="note">No Instinct sessions completed yet.</p>
          ) : (
            <ScoreChart attempts={attempts} />
          )}
        </section>
      </main>
    </div>
  )
}

export default PupilDetail
