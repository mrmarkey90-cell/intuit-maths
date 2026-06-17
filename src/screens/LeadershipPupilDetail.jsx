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
        {streak === 0 ? 'No streak' : `${streak}/3 towards next level`}
      </span>
    </div>
  )
}

function ScoreChart({ attempts }) {
  if (attempts.length === 0) return null
  const sorted = [...attempts].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
  const W = 560, H = 220
  const PAD = { top: 52, right: 24, bottom: 36, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const maxScore = Math.ceil(Math.max(...sorted.map(a => a.score), 10) / 5) * 5
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
      {gridLines.map(v => {
        const y = PAD.top + innerH - (v / maxScore) * innerH
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{v}</text>
          </g>
        )
      })}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />
      <text x={10} y={PAD.top + innerH / 2} textAnchor="middle" fontSize="11" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.top + innerH / 2})`}>Correct</text>
      {pts.length > 1 && <path d={linePath} fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <g key={i}>
          <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4f46e5">L{p.stage}</text>
          <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="11" fill="#6b7280">{p.pct}%</text>
          <circle cx={p.x} cy={p.y} r="6" fill={p.good ? '#4f46e5' : '#a78bfa'} stroke="white" strokeWidth="2" />
          <text x={p.x} y={PAD.top + innerH + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">{p.date}</text>
        </g>
      ))}
    </svg>
  )
}

function lastActiveLabel(dateStr) {
  if (!dateStr) return 'Never'
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function LeadershipPupilDetail({ pupilId, onBack, onPupilDeleted }) {
  const [data, setData] = useState(null)
  const [allClasses, setAllClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_pupil_history', { p_pupil_id: pupilId }),
      supabase.from('classes').select('id, name').order('name'),
    ]).then(([{ data: history }, { data: classes }]) => {
      setData(history)
      setAllClasses(classes ?? [])
      if (history?.pupil?.class_id) setSelectedClassId(history.pupil.class_id)
      setLoading(false)
    })
  }, [pupilId])

  async function handleMove() {
    setMoving(true)
    setMoveSuccess(false)
    const classId = selectedClassId || null
    const { data: result } = await supabase.rpc('move_pupil', {
      p_pupil_id: pupilId,
      p_class_id: classId,
    })
    if (result?.ok) setMoveSuccess(true)
    setMoving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const { data: result } = await supabase.rpc('delete_pupil', { p_pupil_id: pupilId })
    if (result?.ok) onPupilDeleted()
    else setDeleting(false)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!data?.pupil) return <div className="screen"><p>Pupil not found.</p></div>

  const { pupil, attempts } = data
  const stage = pupil.instinct_level ?? 1
  const lastAttempt = attempts?.length > 0
    ? attempts.slice().sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
    : null

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-brand" style={{ flex: 1, textAlign: 'center' }}>intuit</div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 640 }}>
        <div className="page-title">
          <h1>{pupil.first_name} {pupil.last_name}</h1>
          <span className="tier-badge tier-badge--pro">Test Level {stage}</span>
        </div>

        <section className="dashboard-section">
          <div className="pupil-detail-stats">
            <div className="stat-box">
              <div className="stat-number">{stage}</div>
              <div className="stat-label">Test Level</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{pupil.credits ?? 0}</div>
              <div className="stat-label">Credits</div>
            </div>
            <div className="stat-box">
              <div className="stat-number" style={{ fontSize: '1rem' }}>{lastActiveLabel(lastAttempt?.completed_at)}</div>
              <div className="stat-label">Last active</div>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <p className="note" style={{ marginBottom: '0.4rem' }}>Progress to Level {stage + 1}</p>
            <StreakDots streak={pupil.challenge_streak ?? 0} />
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Instinct history</h2>
            <span className="section-count">{attempts?.length ?? 0} sessions</span>
          </div>
          {!attempts?.length ? (
            <p className="note">No sessions completed yet.</p>
          ) : (
            <ScoreChart attempts={attempts} />
          )}
        </section>

        <section className="dashboard-section">
          <h2 style={{ marginBottom: '0.75rem' }}>Move to class</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setMoveSuccess(false) }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' }}
            >
              <option value="">— Unallocated —</option>
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleMove} disabled={moving} className="button-secondary">
              {moving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {moveSuccess && <p className="success" style={{ marginTop: '0.5rem' }}>Moved successfully</p>}
        </section>

        <section className="dashboard-section dashboard-section--danger">
          <h2 style={{ marginBottom: '0.75rem' }}>Delete pupil</h2>
          {!confirmingDelete ? (
            <>
              <p className="note" style={{ marginBottom: '1rem' }}>
                Permanent and cannot be undone. All Instinct history for this pupil will be deleted.
              </p>
              <button className="button-danger" onClick={() => setConfirmingDelete(true)}>
                Delete pupil
              </button>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                Delete <em>{pupil.first_name} {pupil.last_name}</em> and all their data? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="button-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                </button>
                <button className="button-secondary" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default LeadershipPupilDetail
