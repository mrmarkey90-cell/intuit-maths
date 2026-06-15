import { useState } from 'react'
import { supabase } from '../supabaseClient'

const TIER_LABELS = { free: 'Free', pilot: 'Pilot', paid: 'Pro' }

function LeadershipAccount({ school, onBack }) {
  const [changingPin, setChangingPin] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState(null)
  const [pinSuccess, setPinSuccess] = useState(false)

  const [transferring, setTransferring] = useState(false)
  const [transferPin, setTransferPin] = useState('')
  const [transferEmail, setTransferEmail] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState(null)
  const [transferSent, setTransferSent] = useState(false)

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
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinSuccess(true)
    setTimeout(() => setPinSuccess(false), 3000)
    setPinLoading(false)
  }

  function cancelPin() {
    setChangingPin(false)
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinError(null)
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
    if (data?.error === 'wrong_pin') { setTransferError('Leadership PIN is incorrect'); setTransferLoading(false); return }
    if (data?.error) { setTransferError('Something went wrong. Try again.'); setTransferLoading(false); return }
    await supabase.auth.signInWithOtp({ email: transferEmail.toLowerCase().trim() })
    setTransferLoading(false)
    setTransferSent(true)
  }

  function cancelTransfer() {
    setTransferring(false)
    setTransferPin(''); setTransferEmail('')
    setTransferError(null); setTransferSent(false)
  }

  const tier = school.tier ?? 'free'

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← Back</button>
        <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
          <h1>Manage Account</h1>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Subscription</h2>
            <span className={`tier-badge${tier !== 'free' ? ' tier-badge--pro' : ''}`}>
              {TIER_LABELS[tier] ?? tier}
            </span>
          </div>
          {tier === 'free' && (
            <p className="note">Free plan — 1 active class. Contact us to upgrade.</p>
          )}
          {tier === 'pilot' && (
            <p className="note">Pilot account — unlimited active classes. Thank you for partnering with us.</p>
          )}
          {tier === 'paid' && (
            <p className="note">{school.class_slots} active class slot{school.class_slots !== 1 ? 's' : ''}. Contact us to adjust your subscription.</p>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Staff PIN</h2>
            {!changingPin && (
              <button className="button-secondary" onClick={() => setChangingPin(true)}>Change PIN</button>
            )}
          </div>
          <p className="note">Shared with all teachers. Used to access the staff login page.</p>
          {pinSuccess && <p className="success" style={{ marginTop: '0.75rem' }}>PIN updated successfully</p>}
          {changingPin && (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <input type="password" inputMode="numeric" placeholder="Your leadership PIN"
                value={oldPin} maxLength={6}
                onChange={e => { setOldPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              <input type="password" inputMode="numeric" placeholder="New staff PIN (4–6 digits)"
                value={newPin} maxLength={6}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              <input type="password" inputMode="numeric" placeholder="Confirm new PIN"
                value={confirmPin} maxLength={6}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              {pinError && <p className="error">{pinError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleChangePin} disabled={!oldPin || !newPin || !confirmPin || pinLoading}>
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
                <button className="button-secondary" onClick={cancelPin}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Transfer ownership</h2>
            {!transferring && !transferSent && (
              <button className="button-secondary" onClick={() => setTransferring(true)}>Transfer</button>
            )}
          </div>
          <p className="note">Move this school account to a new email address. The current owner loses access once the new owner clicks their link.</p>
          {transferSent ? (
            <div style={{ marginTop: '1rem' }}>
              <p className="success">Magic link sent to <strong>{transferEmail}</strong>.</p>
              <p className="note" style={{ marginTop: '0.5rem' }}>The new owner must click the link to complete the transfer.</p>
              <button className="button-secondary" style={{ marginTop: '1rem' }} onClick={cancelTransfer}>Cancel transfer</button>
            </div>
          ) : transferring ? (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <p className="note" style={{ color: '#b91c1c' }}>
                Warning: you will lose access once the new owner clicks their link.
              </p>
              <input type="password" inputMode="numeric" placeholder="Your leadership PIN"
                value={transferPin} maxLength={6}
                onChange={e => { setTransferPin(e.target.value.replace(/\D/g, '')); setTransferError(null) }} />
              <input type="email" placeholder="New owner's email address"
                value={transferEmail}
                onChange={e => { setTransferEmail(e.target.value); setTransferError(null) }} />
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

export default LeadershipAccount
