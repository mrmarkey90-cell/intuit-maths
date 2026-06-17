import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import PupilProfileCreate from './PupilProfileCreate'

function PupilJoin() {
  const { code } = useParams()
  const joinCode = code.toUpperCase()
  const { setLanguage } = useTranslation()

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
      <h1>Class not found</h1>
      <p className="tagline">Check the link and try again</p>
    </div>
  )

  if (!classInfo) return <div className="screen"><p>Loading...</p></div>

  if (pupil) return (
    <div className="screen">
      <h1>Welcome, {pupil.first_name}!</h1>
      <p className="tagline">Wait for your teacher to start the session</p>
    </div>
  )

  return (
    <PupilProfileCreate joinCode={joinCode} classInfo={classInfo} onComplete={setPupil} />
  )
}

export default PupilJoin
