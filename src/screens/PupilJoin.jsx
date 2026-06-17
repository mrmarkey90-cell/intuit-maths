import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import PupilProfileCreate from './PupilProfileCreate'

function PupilJoin() {
  const { code } = useParams()
  const joinCode = code.toUpperCase()
  const { t, setLanguage } = useTranslation()

  const [classInfo, setClassInfo] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [pupil, setPupil] = useState(null)

  useEffect(() => {
    supabase.rpc('get_class_by_join_code', { p_join_code: joinCode })
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else {
          setClassInfo(data)
          if (data.language) setLanguage(data.language)
        }
      })
  }, [joinCode]) // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) return (
    <div className="screen">
      <h1>{t('pupilJoin.classNotFound')}</h1>
      <p className="tagline">{t('pupilJoin.checkLink')}</p>
    </div>
  )

  if (!classInfo) return <div className="screen"><p>{t('common.loading')}</p></div>

  if (pupil) return (
    <div className="screen">
      <h1>{t('pupilJoin.welcome').replace('{name}', pupil.first_name)}</h1>
      <p className="tagline">{t('pupilJoin.waitForTeacher')}</p>
    </div>
  )

  return (
    <PupilProfileCreate joinCode={joinCode} classInfo={classInfo} onComplete={setPupil} />
  )
}

export default PupilJoin
