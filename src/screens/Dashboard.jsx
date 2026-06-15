import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const TIER_LABELS = { free: 'Free', pilot: 'Pilot', paid: 'Pro' }
const TIER_SLOTS = { free: 1, pilot: null } // null = unlimited

function slotSummary(tier, classSlots, activeCount) {
  if (tier === 'pilot') return 'Unlimited active classes (Pilot)'
  const limit = classSlots ?? TIER_SLOTS[tier] ?? 1
  return `${activeCount} / ${limit} active class${limit !== 1 ? 'es' : ''}`
}

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
  const [togglingId, setTogglingId] = useState(null)
  const [slotError, setSlotError] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferPin, setTransferPin] = useState('')
  const [transferEmail, setTransferEmail] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState(null)
  const [transferSent, setTransferSent] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase
        .from('users')
        .select('school_id, schools(name, school_code, tier, class_slots, slots_expire_at)')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!user) return
      setSchool({ id: user.school_id, ...user.schools })

      const [{ data: classData }, { data: pupilData }] = await Promise.all([
        supabase.from('classes').select('id, name, active').eq('school_id', user.school_id).order('name'),
        supabase.from('pupil_profiles').select('id, class_id').eq('school_id', user.school_id),
      ])

      setClasses(classData ?? [])
      setPupils(pupilData ?? [])
      setLoading(false)
    }
    load()
  }, [session.user.id])

  async function toggleActive(cls) {
    setTogglingId(cls.id)
    setSlotError(null)
    const { data } = await supabase.rpc('toggle_class_active', {
      p_class_id: cls.id,
      p_active: !cls.active,
    })
    if (data?.error === 'no_slots') {
      setSlotError('No active class slots available. Deactivate another class or purchase more slots.')
    } else {
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, active: !c.active } : c))
    }
    setTogglingId(null)
  }

  async function handleChangePin() {
    if (!oldPin) { setPinError('Enter your leadership PIN'); return }
    if (!/^\d{4,6}$/.test(newPin)) { setPinError('New PIN must be 4–6 digits'); return }
    if (newPin !== confirmPin) { setPinError('PINs do not match'); return }
    setPinLoading(true)
    setPinError(null)
    const { error } = await supabase.rpc('set_staff_pin', { leadership_pin: oldPin, new_staff_pin: newPin })
    if (error) {
      setPinError(error.message === 'Incorrect PIN' ? 'Leadership PIN is incorrect' : error.message)
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

  async function handleTransfer() {
    if (!/^\d{4,6}$/.test(transferPin)) { setTransferError('Enter your leadership PIN'); return }
    if (!transferEmail.includes('@')) { setTransferError('Enter a valid email address'); return }
    setTransferLoading(true)
    setTransferError(null)
    const { data } = await supabase.rpc('initiate_transfer', {
      p_leadership_pin: transferPin,
      p_new_email: transferEmail.toLowerCase().trim(),
    })
    if (data?.error === 'wrong_pin') {
      setTransferError('Leadership PIN is incorrect')
      setTransferLoading(false)
      return
    }
    if (data?.error) {
      setTransferError('Something went wrong. Try again.')
      setTransferLoading(false)
      return
    }
    await supabase.auth.signInWithOtp({ email: transferEmail.toLowerCase().trim() })
    setTransferLoading(false)
    setTransferSent(true)
  }

  function cancelTransfer() {
    setTransferring(false)
    setTransferPin('')
    setTransferEmail('')
    setTransferError(null)
    setTransferSent(false)
  }

  function cancelChangePin() {
    setChangingPin(false)
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinError(null)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`https://intuited.uk/school/${school.school_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>

  const tier = school.tier ?? 'free'
  const classSlots = school.class_slots
  const activeCount = classes.filter(c => c.active).length
  const atLimit = tier !== 'pilot' && classSlots != null && activeCount >= classSlots
  const totalPupils = pupils.length
  const pupilsByClass = pupils.reduce((acc, p) => {
    acc[p.class_id] = (acc[p.class_id] || 0) + 1
    return acc
  }, {})
  const teacherLink = `intuited.uk/school/${school.school_code}`

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>{school.name}</h1>
          <span className={`tier-badge${tier !== 'free' ? ' tier-badge--pro' : ''}`}>
            {TIER_LABELS[tier] ?? tier}
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
            <h2>Staff PIN</h2>
            {!changingPin && (
              <button className="button-secondary" onClick={() => setChangingPin(true)}>
                Change PIN
              </button>
            )}
          </div>
          <p className="note">Used by teachers to access the staff link above</p>
          {pinSuccess && <p className="success" style={{ marginTop: '0.75rem' }}>PIN updated successfully</p>}
          {changingPin && (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Your leadership PIN"
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
            <span className="section-count">{slotSummary(tier, classSlots, activeCount)}</span>
          </div>
          <p className="note" style={{ marginBottom: '0.75rem' }}>
            {tier === 'pilot'
              ? 'Pilot account — unlimited active classes.'
              : atLimit
                ? 'All class slots are in use. Deactivate a class to free a slot, or contact us to add more.'
                : `Active classes are visible to teachers. Inactive classes retain all pupil data.`}
          </p>
          {slotError && <p className="error" style={{ marginBottom: '0.75rem' }}>{slotError}</p>}
          {classes.length === 0 ? (
            <p className="note">No classes yet</p>
          ) : (
            <div className="class-list" style={{ margin: 0 }}>
              {classes.map(c => (
                <div key={c.id} className={`class-item ${c.active ? '' : 'class-item--inactive'}`}>
                  <div>
                    <span>{c.name}</span>
                    <span className="note" style={{ marginLeft: '0.5rem' }}>
                      {pupilsByClass[c.id] ?? 0} pupils
                    </span>
                  </div>
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
          {totalPupils > 0 && (
            <p className="note" style={{ marginTop: '0.75rem' }}>{totalPupils} pupil{totalPupils !== 1 ? 's' : ''} total</p>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Transfer ownership</h2>
            {!transferring && !transferSent && (
              <button className="button-secondary" onClick={() => setTransferring(true)}>
                Transfer
              </button>
            )}
          </div>
          <p className="note">Move this school account to a new email address. The current owner loses access when the new owner clicks their link.</p>
          {transferSent ? (
            <div style={{ marginTop: '1rem' }}>
              <p className="success">Magic link sent to <strong>{transferEmail}</strong>.</p>
              <p className="note" style={{ marginTop: '0.5rem' }}>The new owner must click the link to complete the transfer. You can cancel this transfer before they do so.</p>
              <button className="button-secondary" style={{ marginTop: '1rem' }} onClick={cancelTransfer}>Cancel transfer</button>
            </div>
          ) : transferring ? (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <p className="note" style={{ color: '#b91c1c' }}>
                Warning: you will lose access to this account once the new owner clicks their link.
              </p>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Your leadership PIN"
                value={transferPin}
                maxLength={6}
                onChange={e => { setTransferPin(e.target.value.replace(/\D/g, '')); setTransferError(null) }}
              />
              <input
                type="email"
                placeholder="New owner's email address"
                value={transferEmail}
                onChange={e => { setTransferEmail(e.target.value); setTransferError(null) }}
              />
              {transferError && <p className="error">{transferError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleTransfer} disabled={!transferPin || !transferEmail || transferLoading}>
                  {transferLoading ? 'Sending...' : 'Send transfer link'}
                </button>
                <button className="button-secondary" onClick={cancelTransfer}>Cancel</button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
