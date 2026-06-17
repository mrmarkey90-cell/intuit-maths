import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function LeadershipManagePupils({ schoolId, onBack, onSelectPupil }) {
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('pupil_profiles')
      .select('id, first_name, last_name, instinct_level, credits, classes(id, name)')
      .eq('school_id', schoolId)
      .order('last_name')
      .then(({ data }) => {
        setPupils(data ?? [])
        setLoading(false)
      })
  }, [schoolId])

  const filtered = search.trim()
    ? pupils.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : pupils

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-brand" style={{ flex: 1 }}><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main">
        <div className="page-title">
          <h1>Manage Pupils</h1>
          <span className="section-count" style={{ fontSize: '14px', color: '#888' }}>
            {pupils.length} total
          </span>
        </div>
        <section className="dashboard-section">
          <input
            type="search"
            placeholder="Search pupils..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          {loading ? (
            <p className="note">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="note">{search ? 'No pupils match that search.' : 'No pupils yet.'}</p>
          ) : (
            <div className="pupil-list">
              {filtered.map(p => (
                <button key={p.id} className="pupil-list-row" onClick={() => onSelectPupil(p.id)}>
                  <span className="pupil-list-name">{p.first_name} {p.last_name}</span>
                  <span className="pupil-list-meta">
                    <span className="pupil-list-level">L{p.instinct_level}</span>
                    <span className="note">{p.classes?.name ?? 'Unallocated'}</span>
                  </span>
                  <span className="pupil-list-arrow">›</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default LeadershipManagePupils
