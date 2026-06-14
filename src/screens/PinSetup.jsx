import { useState } from 'react'
import { supabase } from '../supabaseClient'

function PinSetup({ session, userData, onComplete }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const schoolUrl = `intuit-education.co.uk/school/${userData.school_code}`

  function validate() {
    if (!/^\d{4,6}$/.test(pin)) return 'PIN must be 4–6 digits'
    if (pin !== confirmPin) return 'PINs do not match'
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('set_user_pin', {
      user_id: session.user.id,
      plain_pin: pin,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    onComplete()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${schoolUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  return (
    <div className="screen">
      <h1>Set your PIN</h1>
      <p className="tagline">You'll use this to log in quickly on shared devices</p>

      <div className="form">
        <input
          type="password"
          inputMode="numeric"
          placeholder="Enter PIN (4–6 digits)"
          value={pin}
          maxLength={6}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Confirm PIN"
          value={confirmPin}
          maxLength={6}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="error">{error}</p>}
      </div>

      <div className="school-link">
        <p className="note">Your school's pupil link:</p>
        <div className="school-link-row">
          <code>{schoolUrl}</code>
          <button className="button-secondary" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!pin || !confirmPin || loading}
        style={{ marginTop: '2rem' }}
      >
        {loading ? 'Saving...' : 'Go to dashboard'}
      </button>
    </div>
  )
}

export default PinSetup
