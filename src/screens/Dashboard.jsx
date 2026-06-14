import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function Dashboard({ session }) {
  const [school, setSchool] = useState(null)
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState(null)
  const [pinSuccess, setPinSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase
        .from('users')
        .select('school_id, schools(name, subscribed, school_code)')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!user) return

      setSchool({ id: user.school_id, ...user.schools })

      const [{ data: classData }, { data: pupilData }] = await Promise.all([
        supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
        supabase.from('pupil_profiles').select('id, class_id').eq('school_id', user.school_id),
      ])

      setClasses(classData ?? [])
      setPupils(pupilData ?? [])
      setLoading(false)
    }
    load()
  }, [session.user.id])

  async function handleChangePin() {
    if (!oldPin) { setPinError('Enter your current PIN'); return }
    if (!/^\d{4,6}$/.test(newPin)) { setPinError('New PIN must be 4–6 digits'); return }
    if (newPin !== confirmPin) { setPinError('PINs do not match'); return }
    setPinLoading(true)
    setPinError(null)
    const { error } = await supabase.rpc('set_school_pin', { old_pin: oldPin, new_pin: newPin })
    if (error) {
      setPinError(error.message === 'Incorrect PIN' ? 'Current PIN is incorrect' : error.message)
      setPinLoading(false)
      return
    }
    setChangingPin(false)
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinSuccess(true)
    setTimeout(() => setPinSuccess(false), 3000)
    setPinLoading(false)
  }

  function cancelChangePin() {
    setChangingPin(false)
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinError(null)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`https://intuit-education.co.uk/school/${school.school_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>

  const teacherLink = `intuit-education.co.uk/school/${school.school_code}`
  const totalPupils = pupils.length
  const pupilsByClass = pupils.reduce((acc, p) => {
    acc[p.class_id] = (acc[p.class_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>{school.name}</h1>
          <span className={`tier-badge${school.subscribed ? ' tier-badge--pro' : ''}`}>
            {school.subscribed ? 'Pro' : 'Free'}
          </span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <h2>Staff access link</h2>
          <p className="note">Share with teachers — they'll enter your school PIN to access their class</p>
          <div className="school-link-row" style={{ marginTop: '0.75rem' }}>
            <code>{teacherLink}</code>
            <button className="button-secondary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>School PIN</h2>
            {!changingPin && (
              <button className="button-secondary" onClick={() => setChangingPin(true)}>
                Change PIN
              </button>
            )}
          </div>
          <p className="note">Used by staff to access the school link above</p>
          {pinSuccess && <p className="success" style={{ marginTop: '0.75rem' }}>PIN updated successfully</p>}
          {changingPin && (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Current PIN"
                value={oldPin}
                maxLength={6}
                onChange={e => { setOldPin(e.target.value.replace(/\D/g, '')); setPinError(null) }}
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="New PIN (4–6 digits)"
                value={newPin}
                maxLength={6}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinError(null) }}
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="Confirm new PIN"
                value={confirmPin}
                maxLength={6}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError(null) }}
              />
              {pinError && <p className="error">{pinError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleChangePin} disabled={!oldPin || !newPin || !confirmPin || pinLoading}>
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
                <button className="button-secondary" onClick={cancelChangePin}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Classes</h2>
            <span className="section-count">{totalPupils} pupil{totalPupils !== 1 ? 's' : ''} total</span>
          </div>
          {classes.length === 0 ? (
            <p className="note">No classes yet</p>
          ) : (
            <div className="class-list" style={{ margin: 0 }}>
              {classes.map(c => (
                <div key={c.id} className="class-item">
                  <span>{c.name}</span>
                  <span className="note">{pupilsByClass[c.id] ?? 0} pupils</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
