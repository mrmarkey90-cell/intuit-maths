import { useState } from 'react'
import { supabase } from '../supabaseClient'
import AvatarBuilder from '../components/AvatarBuilder'

const DEFAULT_AVATAR = { face: 0, hat: 0, glasses: 0, scarf: 0 }
const DEFAULT_UNLOCKED = { faces: [0], hats: [0], glasses: [0], scarves: [0] }

function PupilProfileCreate({ joinCode, classInfo, onComplete }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!firstName.trim()) { setError('Enter your first name'); return }
    if (!lastName.trim()) { setError('Enter your last name'); return }
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('create_pupil_profile', {
      p_join_code: joinCode,
      p_first_name: firstName.trim(),
      p_last_name: lastName.trim(),
      p_avatar: avatar,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    localStorage.setItem('pupilProfile', JSON.stringify(data))
    onComplete(data)
  }

  return (
    <div className="screen">
      <h1>Create your profile</h1>
      <p className="tagline">{classInfo.class_name} — {classInfo.school_name}</p>

      <div className="form">
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={e => { setFirstName(e.target.value); setError(null) }}
        />
        <input
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={e => { setLastName(e.target.value); setError(null) }}
        />
      </div>

      <AvatarBuilder avatar={avatar} unlocked={DEFAULT_UNLOCKED} onChange={setAvatar} />

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!firstName.trim() || !lastName.trim() || loading}
        style={{ marginTop: '1.5rem' }}
      >
        {loading ? 'Saving...' : "That's me!"}
      </button>
    </div>
  )
}

export default PupilProfileCreate
