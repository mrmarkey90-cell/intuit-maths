import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function StaffLogin({ onSuccess }) {
  const { code: schoolCode } = useParams()
  const [schoolName, setSchoolName] = useState(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('get_school_name', { p_school_code: schoolCode })
      .then(({ data }) => setSchoolName(data))
  }, [schoolCode])

  async function handleSubmit() {
    if (!pin) return
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('verify_school_pin', {
      p_school_code: schoolCode,
      p_pin: pin,
    })

    if (rpcError) {
      setError(rpcError.message === 'Incorrect PIN' ? 'Incorrect PIN' : 'School not found')
      setLoading(false)
      return
    }

    onSuccess(data)
  }

  return (
    <div className="screen">
      <h1>{schoolName ?? schoolCode}</h1>
      <p className="tagline">Enter your school PIN to continue</p>

      <div className="form">
        <input
          type="password"
          inputMode="numeric"
          placeholder="School PIN"
          value={pin}
          maxLength={6}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleSubmit} disabled={!pin || loading}>
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </div>
    </div>
  )
}

export default StaffLogin
