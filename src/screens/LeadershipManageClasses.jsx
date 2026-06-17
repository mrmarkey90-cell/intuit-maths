import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function LeadershipManageClasses({ school, onBack, onSelectClass }) {
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const [selected, setSelected] = useState(new Set())
  const [confirmingUnallocate, setConfirmingUnallocate] = useState(false)
  const [unallocating, setUnallocating] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('id, name').eq('school_id', school.id).order('name'),
      supabase.from('pupil_profiles').select('id, class_id').eq('school_id', school.id),
    ]).then(([{ data: cls }, { data: pups }]) => {
      setClasses(cls ?? [])
      setPupils(pups ?? [])
      setLoading(false)
    })
  }, [school.id])

  async function handleAddClass() {
    const name = newName.trim()
    if (!name) return
    setAddLoading(true)
    setAddError(null)
    const { data, error } = await supabase.rpc('create_class', { p_name: name })
    if (error || data?.error) {
      setAddError(error?.message || 'Failed to create class')
      setAddLoading(false)
      return
    }
    setClasses(prev => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setAdding(false)
    setAddLoading(false)
  }

  function cancelAdd() {
    setAdding(false)
    setNewName('')
    setAddError(null)
  }

  function startRename(cls) {
    setRenamingId(cls.id)
    setRenameValue(cls.name)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameValue('')
  }

  async function saveRename() {
    const name = renameValue.trim()
    if (!name || renameLoading) return
    setRenameLoading(true)
    const { data } = await supabase.rpc('rename_class', { p_class_id: renamingId, p_name: name })
    if (data?.ok) {
      setClasses(prev => prev.map(c => c.id === renamingId ? { ...c, name: data.name } : c).sort((a, b) => a.name.localeCompare(b.name)))
    }
    setRenameLoading(false)
    setRenamingId(null)
    setRenameValue('')
  }

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMassUnallocate() {
    setUnallocating(true)
    await supabase.rpc('unallocate_classes', { p_class_ids: [...selected] })
    setPupils(prev => prev.map(p => selected.has(p.class_id) ? { ...p, class_id: null } : p))
    setSelected(new Set())
    setConfirmingUnallocate(false)
    setUnallocating(false)
  }

  const pupilsByClass = pupils.reduce((acc, p) => {
    if (p.class_id) acc[p.class_id] = (acc[p.class_id] || 0) + 1
    return acc
  }, {})
  const selectedPupilCount = [...selected].reduce((sum, id) => sum + (pupilsByClass[id] ?? 0), 0)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main">
        <div className="page-title">
          <h1>Manage Classes</h1>
        </div>

        {selected.size > 0 && (
          <section className="dashboard-section" style={{ borderColor: '#fca5a5', background: '#fff9f9' }}>
            {!confirmingUnallocate ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <span className="note">{selected.size} class{selected.size !== 1 ? 'es' : ''} selected</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="button-secondary" onClick={() => setSelected(new Set())}>Clear</button>
                  <button className="button-danger" onClick={() => setConfirmingUnallocate(true)}>
                    Unallocate pupils
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                  Unallocate all {selectedPupilCount} pupil{selectedPupilCount !== 1 ? 's' : ''} from the {selected.size} selected class{selected.size !== 1 ? 'es' : ''}? They are not deleted — just unparented, and can be moved to a class again later.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="button-danger" onClick={handleMassUnallocate} disabled={unallocating}>
                    {unallocating ? 'Unallocating...' : 'Yes, unallocate'}
                  </button>
                  <button className="button-secondary" onClick={() => setConfirmingUnallocate(false)}>Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="dashboard-section">
          {loading ? (
            <p className="note">Loading...</p>
          ) : classes.length === 0 && !adding ? (
            <p className="note">No classes yet.</p>
          ) : (
            <div className="pupil-list">
              {classes.map(c => (
                <div key={c.id} className="pupil-list-row" style={{ cursor: renamingId === c.id ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ marginRight: '0.75rem', width: 18, height: 18, flexShrink: 0 }}
                  />
                  {renamingId === c.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename()}
                        autoFocus
                        maxLength={50}
                        style={{ flex: 1 }}
                      />
                      <button onClick={saveRename} disabled={!renameValue.trim() || renameLoading}>
                        {renameLoading ? '...' : 'Save'}
                      </button>
                      <button className="button-secondary" onClick={cancelRename}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className="pupil-list-name" onClick={() => onSelectClass(c.id)} style={{ cursor: 'pointer' }}>
                        {c.name}
                      </span>
                      <span className="pupil-list-meta">
                        <span className="note">{pupilsByClass[c.id] ?? 0} pupils</span>
                        <button
                          className="button-secondary"
                          onClick={e => { e.stopPropagation(); startRename(c) }}
                          style={{ padding: '4px 10px', fontSize: '13px' }}
                        >
                          Rename
                        </button>
                      </span>
                      <span className="pupil-list-arrow" onClick={() => onSelectClass(c.id)} style={{ cursor: 'pointer' }}>›</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

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
        </section>
      </main>
    </div>
  )
}

export default LeadershipManageClasses
