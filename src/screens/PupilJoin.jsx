import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import PupilProfileCreate from './PupilProfileCreate'
import PupilClassGrid from './PupilClassGrid'

function PupilJoin() {
  const { code } = useParams()
  const joinCode = code.toUpperCase()

  const [classInfo, setClassInfo] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [view, setView] = useState('landing')
  const [pupil, setPupil] = useState(null)

  useEffect(() => {
    supabase.rpc('get_class_by_join_code', { p_join_code: joinCode })
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setClassInfo(data)
      })
  }, [joinCode])

  function handleComplete(profile) {
    setPupil(profile)
    setView('welcome')
  }

  if (notFound) return (
    <div className="screen">
      <h1>Class not found</h1>
      <p className="tagline">Check the link and try again</p>
    </div>
  )

  if (!classInfo) return <div className="screen"><p>Loading...</p></div>

  if (view === 'create') return (
    <PupilProfileCreate joinCode={joinCode} classInfo={classInfo} onComplete={handleComplete} />
  )

  if (view === 'returning') return (
    <PupilClassGrid joinCode={joinCode} classInfo={classInfo} onSelect={handleComplete} />
  )

  if (view === 'welcome') return (
    <div className="screen">
      <h1>Welcome, {pupil.first_name}!</h1>
      <p className="tagline">Wait for your teacher to start the session</p>
    </div>
  )

  return (
    <div className="screen">
      <h1>{classInfo.class_name}</h1>
      <p className="tagline">{classInfo.school_name}</p>
      <div className="join-options">
        <button onClick={() => setView('create')}>Create my profile</button>
        <button className="button-secondary" onClick={() => setView('returning')}>
          I'm already here
        </button>
      </div>
    </div>
  )
}

export default PupilJoin
