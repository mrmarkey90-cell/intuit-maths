import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function LeadershipManageClasses({ school, onBack, onSelectClass }) {
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [slotError, setSlotError] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('id, name, active').eq('school_id', school.id).order('name'),
      supabase.from('pupil_profiles').select('id, class_id').eq('school_id', school.id),
    ]).then(([{ data: cls }, { data: pups }]) => {
      setClasses(cls ?? [])
      setPupils(pups ?? [])
      setLoading(false)
    })
  }, [school.id])

  async function toggleActive(cls) {
    if (togglingId) return
    setTogglingId(cls.id)
    setSlotError(null)
    const { data } = await supabase.rpc('toggle_class_active', { p_class_id: cls.id, p_active: !cls.active })
    if (data?.error === 'no_slots') {
      setSlotError('All class slots are in use. Deactivate a class first.')
    } else {
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, active: !c.active } : c))
    }
    setTogglingId(null)
  }

  const tier = school.tier ?? 'free'
  const activeCount = classes.filter(c => c.active).length
  const atLimit = tier !== 'pilot' && school.class_slots != null && activeCount >= school.class_slots
  const pupilsByClass = pupils.reduce((acc, p) => {
    if (p.class_id) acc[p.class_id] = (acc[p.class_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
          <h1>Manage Classes</h1>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <div style={{ marginBottom: editing ? '0.5rem' : '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>Manage active classes</span>
              <button
                className={`toggle-switch ${editing ? 'toggle-switch--on' : ''}`}
                onClick={() => { setEditing(e => !e); setSlotError(null) }}
                role="switch"
                aria-checked={editing}
              />
            </div>
            <div className="note">
              {tier === 'pilot' ? 'Unlimited' : `${activeCount} of ${school.class_slots ?? 1}`} active
            </div>
          </div>

          {editing && (
            <p className="note" style={{ marginBottom: '1rem' }}>
              {atLimit
                ? 'Slot limit reached — deactivate a class to free a slot.'
                : 'Click a class to activate or deactivate it.'}
            </p>
          )}
          {slotError && <p className="error" style={{ marginBottom: '1rem' }}>{slotError}</p>}

          {loading ? (
            <p className="note">Loading...</p>
          ) : classes.length === 0 ? (
            <p className="note">No classes yet.</p>
          ) : editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {classes.map(c => (
                <button
                  key={c.id}
                  className={`class-toggle-item ${c.active ? 'class-toggle-item--active' : 'class-toggle-item--inactive'}`}
                  onClick={() => toggleActive(c)}
                  disabled={togglingId === c.id || (!c.active && atLimit)}
                >
                  <span className="class-toggle-dot" />
                  <span className="class-toggle-name">{c.name}</span>
                  <span className="note" style={{ marginLeft: 'auto' }}>
                    {togglingId === c.id ? '...' : `${pupilsByClass[c.id] ?? 0} pupils`}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pupil-list">
              {classes.map(c => (
                <button
                  key={c.id}
                  className={`pupil-list-row ${c.active ? '' : 'class-item--inactive'}`}
                  onClick={() => onSelectClass(c.id)}
                >
                  <span className="pupil-list-name">{c.name}</span>
                  <span className="pupil-list-meta">
                    {!c.active && <span className="inactive-badge">Inactive</span>}
                    <span className="note">{pupilsByClass[c.id] ?? 0} pupils</span>
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

export default LeadershipManageClasses
