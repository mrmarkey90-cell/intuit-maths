import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function Dashboard({ session }) {
  const [school, setSchool] = useState(null)
  const [classes, setClasses] = useState([])
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase
        .from('users')
        .select('school_id, schools(name, subscribed, school_code)')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!user) return

      setSchool({ id: user.school_id, ...user.schools })

      const [{ data: classData }, { data: pupilData }] = await Promise.all([
        supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
        supabase.from('pupil_profiles').select('id, class_id').eq('school_id', user.school_id),
      ])

      setClasses(classData ?? [])
      setPupils(pupilData ?? [])
      setLoading(false)
    }
    load()
  }, [session.user.id])

  async function copyLink() {
    await navigator.clipboard.writeText(`https://intuit-education.co.uk/school/${school.school_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>

  const teacherLink = `intuit-education.co.uk/school/${school.school_code}`
  const totalPupils = pupils.length
  const pupilsByClass = pupils.reduce((acc, p) => {
    acc[p.class_id] = (acc[p.class_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>{school.name}</h1>
          <span className={`tier-badge${school.subscribed ? ' tier-badge--pro' : ''}`}>
            {school.subscribed ? 'Pro' : 'Free'}
          </span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <h2>Staff access link</h2>
          <p className="note">Share with teachers — they'll enter your school PIN to access their class</p>
          <div className="school-link-row" style={{ marginTop: '0.75rem' }}>
            <code>{teacherLink}</code>
            <button className="button-secondary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Classes</h2>
            <span className="section-count">{totalPupils} pupil{totalPupils !== 1 ? 's' : ''} total</span>
          </div>
          {classes.length === 0 ? (
            <p className="note">No classes yet</p>
          ) : (
            <div className="class-list" style={{ margin: 0 }}>
              {classes.map(c => (
                <div key={c.id} className="class-item">
                  <span>{c.name}</span>
                  <span className="note">{pupilsByClass[c.id] ?? 0} pupils</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
