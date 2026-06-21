import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import PupilProfileCreate from './PupilProfileCreate'
import PlacementTest from '../insight/PlacementTest'

function PupilJoin() {
  const { code } = useParams()
  const joinCode = code
  const navigate = useNavigate()
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

  if (pupil) {
    return (
      <PlacementTest
        pupilId={pupil.id}
        onComplete={() => {
          // We just confirmed who this pupil is (created their profile this
          // very session) -- seed the hub's "skip re-selection" shortcut so
          // they land straight on their dashboard instead of being asked to
          // tap their own name tile again immediately after.
          sessionStorage.setItem(`hub_pupil_${joinCode}`, pupil.id)
          navigate(`/hub/${joinCode}`)
        }}
      />
    )
  }

  return (
    <PupilProfileCreate joinCode={joinCode} classInfo={classInfo} onComplete={setPupil} />
  )
}

export default PupilJoin
