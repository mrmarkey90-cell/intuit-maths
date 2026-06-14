import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Landing() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSubmitted(true)
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="screen">
        <h1>Check your email</h1>
        <p>We've sent a login link to <strong>{email}</strong></p>
        <p>Click the link in the email to continue setting up your school.</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Intuit Education</h1>
      <p className="tagline">Arithmetic fluency for Welsh primary schools</p>

      <div className="form">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button onClick={handleSubmit} disabled={!email || loading}>
          {loading ? 'Sending...' : 'Get started'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      <p className="privacy">
        Your data is never shared with third parties. We'll only ever email you your login link — nothing else.
      </p>
    </div>
  )
}

export default Landing