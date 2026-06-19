import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarDisplay from '../components/AvatarDisplay'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'

function PupilClassGrid({ joinCode, classInfo, onSelect }) {
  const { t } = useTranslation()
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_class_pupils', { p_join_code: joinCode })
      .then(({ data }) => {
        setPupils(data ?? [])
        setLoading(false)
      })
  }, [joinCode])

  if (loading) return <div className="screen"><p>{t('common.loading')}</p></div>

  return (
    <div className="screen">
      <h1>{t('pupilHub.whoAreYou')}</h1>
      <p className="tagline">{classInfo.class_name}</p>

      {pupils.length === 0 ? (
        <p className="note">{t('pupilClassGrid.noProfiles')}</p>
      ) : (
        <div className="pupil-grid">
          {pupils.map(p => (
            <button key={p.id} className="pupil-tile" onClick={() => {
              localStorage.setItem('pupilProfile', JSON.stringify(p))
              onSelect(p)
            }}>
              <AvatarDisplay avatar={p.avatar ?? DEFAULT_AVATAR} size={80} />
              <span className="pupil-tile-name">{p.first_name}</span>
              <span className="pupil-tile-surname">{p.last_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PupilClassGrid
