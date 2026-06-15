import { useState } from 'react'

function StaffClassDashboard({ school, cls }) {
  const [copied, setCopied] = useState(false)

  const profileUrl = `intuited.uk/join/${cls.id}`

  async function copyLink() {
    await navigator.clipboard.writeText(`https://${profileUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>Maths Challenge</h2>
          </div>
          <p className="note">Start a session and pupils join with a code — coming soon</p>
        </section>
      </main>
    </div>
  )
}

export default StaffClassDashboard
