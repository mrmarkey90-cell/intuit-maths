import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function LeadershipManageClasses({ school, onBack, onSelectClass }) {
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
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
    setTogglingId(cls.id)
    setSlotError(null)
    const { data } = await supabase.rpc('toggle_class_active', { p_class_id: cls.id, p_active: !cls.active })
    if (data?.error === 'no_slots') {
      setSlotError('No active class slots available. Deactivate another class or contact us to add more.')
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
          <span className="section-count" style={{ fontSize: '14px', color: '#888' }}>
            {tier === 'pilot' ? 'Unlimited' : `${activeCount} / ${school.class_slots ?? 1}`} active
          </span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <p className="note" style={{ marginBottom: '1rem' }}>
            {tier === 'pilot'
              ? 'Pilot account — unlimited active classes.'
              : atLimit
                ? 'All class slots in use. Deactivate a class to free a slot.'
                : 'Active classes are visible to teachers. Inactive classes retain all data.'}
          </p>
          {slotError && <p className="error" style={{ marginBottom: '1rem' }}>{slotError}</p>}
          {loading ? (
            <p className="note">Loading...</p>
          ) : classes.length === 0 ? (
            <p className="note">No classes yet.</p>
          ) : (
            <div className="pupil-list">
              {classes.map(c => (
                <div key={c.id} className={`class-item ${c.active ? '' : 'class-item--inactive'}`}>
                  <button className="class-item-link" onClick={() => onSelectClass(c.id)}>
                    <span>{c.name}</span>
                    <span className="note" style={{ marginLeft: '0.5rem' }}>
                      {pupilsByClass[c.id] ?? 0} pupils
                    </span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!c.active && <span className="inactive-badge">Inactive</span>}
                    <button
                      className="button-secondary"
                      onClick={() => toggleActive(c)}
                      disabled={togglingId === c.id || (!c.active && atLimit)}
                    >
                      {togglingId === c.id ? '...' : c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default LeadershipManageClasses
