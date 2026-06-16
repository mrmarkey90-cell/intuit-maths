import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function lastActiveLabel(dateStr) {
  if (!dateStr) return 'Never'
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function LeadershipClassDetail({ classId, onBack, onSelectPupil, onClassDeleted }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.rpc('get_leadership_class_detail', { p_class_id: classId }).then(({ data: result }) => {
      setData(result)
      setLoading(false)
    })
  }, [classId])

  async function handleDelete() {
    setDeleting(true)
    const { data: result } = await supabase.rpc('delete_class', { p_class_id: classId })
    if (result?.ok) onClassDeleted(classId)
    else setDeleting(false)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!data || data.error) return <div className="screen"><p>Class not found.</p></div>

  const { class: cls, pupils } = data

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
          <h1>{cls.name}</h1>
          <span className={`tier-badge${cls.active ? ' tier-badge--pro' : ''}`}>
            {cls.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Pupils</h2>
            <span className="section-count">{pupils.length}</span>
          </div>
          {pupils.length === 0 ? (
            <p className="note">No pupils in this class yet.</p>
          ) : (
            <div className="pupil-list">
              {pupils.map(p => (
                <button key={p.id} className="pupil-list-row" onClick={() => onSelectPupil(p.id)}>
                  <span className="pupil-list-name">{p.first_name} {p.last_name}</span>
                  <span className="pupil-list-meta">
                    <span className="pupil-list-level">L{p.instinct_level}</span>
                    <span className="note">{lastActiveLabel(p.last_attempt_at)}</span>
                  </span>
                  <span className="pupil-list-arrow">›</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section dashboard-section--danger">
          <h2 style={{ marginBottom: '0.75rem' }}>Delete class</h2>
          {!confirming ? (
            <>
              <p className="note" style={{ marginBottom: '1rem' }}>
                Permanent and cannot be undone. Pupils are not deleted — they become unallocated and can be moved to another class.
              </p>
              <button className="button-danger" onClick={() => setConfirming(true)}>
                Delete class
              </button>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                Delete <em>{cls.name}</em>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="button-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                </button>
                <button className="button-secondary" onClick={() => setConfirming(false)}>
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

export default LeadershipClassDetail
