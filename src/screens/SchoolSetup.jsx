import { useState } from 'react'
import { supabase } from '../supabaseClient'

function SchoolSetup({ session, onComplete }) {
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!schoolName.trim()) return
    setLoading(true)
    setError(null)

    const code = schoolName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
      + Math.floor(10 + Math.random() * 90)

    const { data: school, error: schoolError } = await supabase
      .rpc('create_school', {
        school_name: schoolName,
        school_code: code
      })

    if (schoolError) {
      setError(schoolError.message)
      setLoading(false)
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: session.user.id,
        name: session.user.email,
        email: session.user.email,
        role: 'leadership',
        school_id: school.id
      })

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    onComplete(school.id, code)
  }

  return (
    <div className="screen">
      <h1>Welcome to Intuit Education</h1>
      <p className="tagline">Let's get your school set up</p>

      <div className="form">
        <input
          type="text"
          placeholder="Your school name"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button onClick={handleSubmit} disabled={!schoolName.trim() || loading}>
          {loading ? 'Setting up...' : 'Continue'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}

export default SchoolSetup