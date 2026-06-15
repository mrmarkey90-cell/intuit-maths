import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import AvatarDisplay from '../components/AvatarDisplay'

function PupilClassGrid({ joinCode, classInfo, onSelect }) {
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_class_pupils', { p_join_code: joinCode })
      .then(({ data }) => {
        setPupils(data ?? [])
        setLoading(false)
      })
  }, [joinCode])

  if (loading) return <div className="screen"><p>Loading...</p></div>

  return (
    <div className="screen">
      <h1>Who are you?</h1>
      <p className="tagline">{classInfo.class_name}</p>

      {pupils.length === 0 ? (
        <p className="note">No profiles yet — ask your teacher to check the join link</p>
      ) : (
        <div className="pupil-grid">
          {pupils.map(p => (
            <button key={p.id} className="pupil-tile" onClick={() => {
              localStorage.setItem('pupilProfile', JSON.stringify(p))
              onSelect(p)
            }}>
              <AvatarDisplay avatar={p.avatar ?? { face: 0, hat: 0, glasses: 0, scarf: 0 }} size={80} />
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
