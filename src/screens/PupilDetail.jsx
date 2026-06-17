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

function PupilDetail({ pupilId, onBack, onLevelChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [overrideInstinct, setOverrideInstinct] = useState(1)
  const [overrideInsight, setOverrideInsight] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function loadData() {
    const { data: result } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupilId })
    setData(result)
    if (result?.pupil) {
      setOverrideInstinct(result.pupil.instinct_level ?? 1)
      setOverrideInsight(result.pupil.insight_level ?? 1)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [pupilId])

  async function saveLevels() {
    setSaving(true)
    await supabase.rpc('set_pupil_levels', {
      p_pupil_id: pupilId,
      p_instinct_level: overrideInstinct,
      p_insight_level: overrideInsight,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onLevelChanged?.()
    loadData()
  }

  if (loading) return <div className="dashboard"><main className="dashboard-main"><p>Loading...</p></main></div>
  if (!data?.pupil) return <div className="dashboard"><main className="dashboard-main"><p>Pupil not found.</p></main></div>

  const { pupil, attempts } = data
  const instinctLevel = pupil.instinct_level ?? 1
  const insightLevel = pupil.insight_level ?? 1
  const streak = pupil.challenge_streak ?? 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-brand" style={{ flex: 1, textAlign: 'center' }}>intuit</div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 640 }}>
        <div className="page-title">
          <h1>{pupil.first_name} {pupil.last_name}</h1>
        </div>

        <section className="dashboard-section">
          <div className="section-heading"><h2>Levels</h2></div>
          <div className="pupil-detail-levels">
            <div className="pupil-detail-level-block pupil-detail-level-block--instinct">
              <div className="level-block-header">
                <span className="level-block-label">Instinct</span>
                <span className="level-block-number">{instinctLevel}</span>
              </div>
              <StreakDots streak={streak} />
            </div>
            <div className="pupil-detail-level-block pupil-detail-level-block--insight">
              <div className="level-block-header">
                <span className="level-block-label">Insight</span>
                <span className="level-block-number">{insightLevel}</span>
              </div>
              <p className="note" style={{ marginTop: '0.75rem' }}>Insight coming soon</p>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading"><h2>Override levels</h2></div>
          <p className="note" style={{ marginBottom: '1rem' }}>
            Manually set this pupil's levels. This resets their streak and bad-streak progress.
          </p>
          <div className="level-override-form">
            <div className="level-override-row">
              <label className="level-override-label">Instinct</label>
              <select
                className="level-override-select"
                value={overrideInstinct}
                onChange={e => setOverrideInstinct(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="level-override-row">
              <label className="level-override-label">Insight</label>
              <select
                className="level-override-select"
                value={overrideInsight}
                onChange={e => setOverrideInsight(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button
              onClick={saveLevels}
              disabled={saving || (overrideInstinct === instinctLevel && overrideInsight === insightLevel)}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
            </button>
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
