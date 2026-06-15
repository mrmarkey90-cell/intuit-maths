import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Landing() {
  const [tab, setTab] = useState('signup')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function reset() {
    setEmail('')
    setPin('')
    setError(null)
    setSubmitted(false)
  }

  function switchTab(t) {
    setTab(t)
    reset()
  }

  async function handleMagicLink() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { setError(error.message); setLoading(false) }
    else { setSubmitted(true); setLoading(false) }
  }

  async function handlePinLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
    if (error) {
      setError('Incorrect email or PIN')
      setLoading(false)
    }
  }

  async function handleSignUp() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { setError(error.message); setLoading(false) }
    else { setSubmitted(true); setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="screen">
        <h1>Check your email</h1>
        <p>We've sent a link to <strong>{email}</strong></p>
        <p style={{ marginTop: '0.5rem' }}>Click it to continue.</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Intuit Education</h1>
      <p className="tagline">Arithmetic fluency for Welsh primary schools</p>

      <div className="tab-bar">
        <button
          className={`tab${tab === 'signup' ? ' tab--active' : ''}`}
          onClick={() => switchTab('signup')}
        >
          Sign up
        </button>
        <button
          className={`tab${tab === 'magic' ? ' tab--active' : ''}`}
          onClick={() => switchTab('magic')}
        >
          Email link
        </button>
        <button
          className={`tab${tab === 'pin' ? ' tab--active' : ''}`}
          onClick={() => switchTab('pin')}
        >
          Email + PIN
        </button>
      </div>

      {tab === 'signup' && (
        <div className="form">
          <input
            type="email"
            placeholder="Your school email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSignUp()}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleSignUp} disabled={!email || loading}>
            {loading ? 'Sending...' : 'Create account'}
          </button>
          <p className="privacy">
            Your data is never shared with third parties. We'll only ever email you your login link — nothing else.
          </p>
        </div>
      )}

      {tab === 'magic' && (
        <div className="form">
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleMagicLink} disabled={!email || loading}>
            {loading ? 'Sending...' : 'Send link'}
          </button>
        </div>
      )}

      {tab === 'pin' && (
        <div className="form">
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Your leadership PIN"
            value={pin}
            maxLength={6}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handlePinLogin()}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handlePinLogin} disabled={!email || !pin || loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      )}
    </div>
  )
}

export default Landing
