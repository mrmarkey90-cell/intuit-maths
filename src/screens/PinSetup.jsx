import { useState } from 'react'
import { supabase } from '../supabaseClient'

function PinSetup({ userData, onComplete }) {
  const [leadershipPin, setLeadershipPin] = useState('')
  const [confirmLeadershipPin, setConfirmLeadershipPin] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [confirmStaffPin, setConfirmStaffPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const schoolUrl = `intuit-education.co.uk/school/${userData.school_code}`

  function validate() {
    if (!/^\d{4,6}$/.test(leadershipPin)) return 'Your PIN must be 4–6 digits'
    if (leadershipPin !== confirmLeadershipPin) return 'Your PINs do not match'
    if (!/^\d{4,6}$/.test(staffPin)) return 'Staff PIN must be 4–6 digits'
    if (staffPin !== confirmStaffPin) return 'Staff PINs do not match'
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.updateUser({ password: leadershipPin })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { error: rpcError } = await supabase.rpc('complete_onboarding', {
      leadership_pin: leadershipPin,
      staff_pin: staffPin,
    })
    if (rpcError) { setError(rpcError.message); setLoading(false); return }

    onComplete()
  }

  return (
    <div className="screen">
      <h1>Set your PINs</h1>
      <p className="tagline">Two PINs — one for you, one for your staff</p>

      <div className="form">
        <p className="pin-section-label">Your leadership PIN</p>
        <p className="note" style={{ marginBottom: '0.5rem' }}>Used to log in and authorise changes</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder="Enter PIN (4–6 digits)"
          value={leadershipPin}
          maxLength={6}
          onChange={e => { setLeadershipPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Confirm PIN"
          value={confirmLeadershipPin}
          maxLength={6}
          onChange={e => { setConfirmLeadershipPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />

        <p className="pin-section-label" style={{ marginTop: '1rem' }}>Staff PIN</p>
        <p className="note" style={{ marginBottom: '0.5rem' }}>Shared with teachers to access their class</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder="Enter PIN (4–6 digits)"
          value={staffPin}
          maxLength={6}
          onChange={e => { setStaffPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Confirm PIN"
          value={confirmStaffPin}
          maxLength={6}
          onChange={e => { setConfirmStaffPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />

        {error && <p className="error">{error}</p>}
      </div>

      <div className="school-link">
        <p className="note">Your school's staff link:</p>
        <div className="school-link-row">
          <code>{schoolUrl}</code>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!leadershipPin || !confirmLeadershipPin || !staffPin || !confirmStaffPin || loading}
        style={{ marginTop: '2rem' }}
      >
        {loading ? 'Saving...' : 'Go to dashboard'}
      </button>
    </div>
  )
}

export default PinSetup
