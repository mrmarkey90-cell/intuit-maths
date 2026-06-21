import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarBuilder from '../components/AvatarBuilder'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR, DEFAULT_UNLOCKED } from '../lib/avatarConfig'

function PupilProfileCreate({ joinCode, onComplete }) {
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
        <div className="profile-left-col">
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

          <AvatarDisplay avatar={avatar} size="clamp(90px, 32vh, 220px)" />

          {error && <p className="error">{error}</p>}

          <button
            className="profile-submit-btn"
            onClick={handleSubmit}
            disabled={!firstName.trim() || !lastName.trim() || loading}
          >
            {loading ? t('common.saving') : t('pupilProfileCreate.thatsMe')}
          </button>
        </div>

        <div className="profile-right-col">
          <AvatarBuilder avatar={avatar} unlocked={DEFAULT_UNLOCKED} onChange={setAvatar} />
        </div>
      </div>
    </div>
  )
}

export default PupilProfileCreate
