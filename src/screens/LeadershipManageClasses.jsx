import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function LeadershipManageClasses({ school, onBack, onSelectClass }) {
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [slotError, setSlotError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

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

  async function handleAddClass() {
    const name = newName.trim()
    if (!name) return
    setAddLoading(true)
    setAddError(null)
    const active = !atLimit
    const { data, error } = await supabase.rpc('create_class', { p_name: name, p_active: active })
    if (error || data?.error) {
      setAddError(error?.message || 'Failed to create class')
      setAddLoading(false)
      return
    }
    setClasses(prev =>
      [...prev, { id: data.id, name: data.name, active: data.active }]
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewName('')
    setAdding(false)
    setAddLoading(false)
  }

  function cancelAdd() {
    setAdding(false)
    setNewName('')
    setAddError(null)
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
        <div className="active-classes-pill">
          <div>
            <div className="active-classes-pill-count">
              {tier === 'pilot' ? 'Unlimited active classes' : `${activeCount} of ${school.class_slots ?? 1} active`}
            </div>
            {editing && (
              <div className="note" style={{ marginTop: '0.15rem' }}>
                {atLimit ? 'Deactivate a class to free a slot.' : 'Click a class to activate or deactivate it.'}
              </div>
            )}
            {slotError && <p className="error" style={{ marginTop: '0.25rem' }}>{slotError}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="note">Edit</span>
            <button
              className={`toggle-switch ${editing ? 'toggle-switch--on' : ''}`}
              onClick={() => { setEditing(e => !e); setSlotError(null) }}
              role="switch"
              aria-checked={editing}
            />
          </div>
        </div>

        <section className="dashboard-section">
          {loading ? (
            <p className="note">Loading...</p>
          ) : classes.length === 0 && !adding ? (
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

          {!editing && (
            <div style={{ marginTop: classes.length > 0 ? '0.75rem' : 0 }}>
              {adding ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Class name"
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setAddError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                    autoFocus
                    maxLength={50}
                  />
                  {atLimit && (
                    <p className="note">All active slots are in use — this class will be created as inactive.</p>
                  )}
                  {addError && <p className="error">{addError}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleAddClass} disabled={!newName.trim() || addLoading}>
                      {addLoading ? 'Adding...' : 'Add class'}
                    </button>
                    <button className="button-secondary" onClick={cancelAdd}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="button-secondary" onClick={() => setAdding(true)}>
                  + Add a class
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default LeadershipManageClasses
