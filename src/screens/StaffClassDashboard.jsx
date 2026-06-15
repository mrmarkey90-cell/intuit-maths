import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import SessionHost from './session/SessionHost'

function StaffClassDashboard({ school, cls }) {
  const [copied, setCopied] = useState(false)
  const [session, setSession] = useState(null)
  const [weeklyUsed, setWeeklyUsed] = useState(false)
  const [classPupils, setClassPupils] = useState([])
  const [starting, setStarting] = useState(false)

  const profileUrl = `intuited.uk/join/${cls.join_code}`

  useEffect(() => {
    // Check weekly challenge status + any active session
    supabase.rpc('get_class_session_status', { p_class_id: cls.id }).then(({ data }) => {
      if (!data) return
      setWeeklyUsed(data.weekly_used)
      if (data.active_session) {
        // Restore active session (e.g. after page refresh)
        setSession(data.active_session)
      }
    })
    // Load class pupils for the session lobby grid
    supabase.rpc('get_class_pupils', { p_join_code: cls.join_code }).then(({ data }) => {
      setClassPupils(data ?? [])
    })
  }, [cls.id, cls.join_code])

  async function copyLink() {
    await navigator.clipboard.writeText(`https://${profileUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function startChallenge() {
    setStarting(true)
    const { data, error } = await supabase.rpc('create_session', {
      p_class_id: cls.id,
      p_challenge_type: 'challenge',
    })
    setStarting(false)
    if (error || data?.error) {
      if (data?.error === 'weekly_challenge_used') {
        setWeeklyUsed(true)
      }
      return
    }
    setSession(data)
    setWeeklyUsed(true)
  }

  if (session) {
    return (
      <SessionHost
        school={school}
        cls={cls}
        session={session}
        classPupils={classPupils}
        onEnd={() => setSession(null)}
      />
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>{cls.name}</h1>
          <span className="tier-badge">{school.name}</span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Class Challenge</h2>
          </div>
          <p className="note">
            {weeklyUsed
              ? 'This week\'s challenge has been completed. Available again on Sunday.'
              : 'Start a 90-second class-wide maths challenge. Each pupil gets questions at their own level.'}
          </p>
          <button
            onClick={startChallenge}
            disabled={weeklyUsed || starting}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            {starting ? 'Setting up...' : weeklyUsed ? 'Done this week' : 'Start Class Challenge'}
          </button>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Pupil Profile Creator</h2>
          </div>
          <p className="note">Pupils use this link to create their profile for the first time</p>
          <div className="school-link-row" style={{ marginTop: '0.75rem' }}>
            <code>{profileUrl}</code>
            <button className="button-secondary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default StaffClassDashboard
