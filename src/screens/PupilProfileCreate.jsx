import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarBuilder from '../components/AvatarBuilder'
import AvatarDisplay from '../components/AvatarDisplay'

const DEFAULT_AVATAR = { face: 0, hat: 0, glasses: 0, scarf: 0 }
const DEFAULT_UNLOCKED = { faces: [0], hats: [0], glasses: [0], scarves: [0] }

function PupilProfileCreate({ joinCode, classInfo, onComplete }) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (!firstName.trim()) { setError(t('pupilProfileCreate.errFirstName')); return }
    if (!lastName.trim()) { setError(t('pupilProfileCreate.errLastName')); return }
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
      <div className="profile-create-body">
        <div className="profile-avatar-panel">
          <AvatarDisplay avatar={avatar} size={140} />
        </div>

        <div className="profile-form-panel">
          <h1>{t('pupilProfileCreate.title')}</h1>
          <p className="tagline">{classInfo.class_name} — {classInfo.school_name}</p>

          <div className="form">
            <input
              type="text"
              placeholder={t('pupilProfileCreate.firstNamePlaceholder')}
              value={firstName}
              onChange={e => { setFirstName(e.target.value); setError(null) }}
            />
            <input
              type="text"
              placeholder={t('pupilProfileCreate.lastNamePlaceholder')}
              value={lastName}
              onChange={e => { setLastName(e.target.value); setError(null) }}
            />
          </div>

          <AvatarBuilder avatar={avatar} unlocked={DEFAULT_UNLOCKED} onChange={setAvatar} />

          {error && <p className="error" style={{ marginTop: '0.5rem' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!firstName.trim() || !lastName.trim() || loading}
            style={{ marginTop: '0.75rem' }}
          >
            {loading ? t('common.saving') : t('pupilProfileCreate.thatsMe')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PupilProfileCreate
