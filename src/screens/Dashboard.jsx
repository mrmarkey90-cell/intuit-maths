import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import LeadershipManageClasses from './LeadershipManageClasses'
import LeadershipManagePupils from './LeadershipManagePupils'
import LeadershipAccount from './LeadershipAccount'
import LeadershipClassDetail from './LeadershipClassDetail'
import LeadershipPupilDetail from './LeadershipPupilDetail'

const TIER_LABELS = { free: 'Free', pilot: 'Pilot', paid: 'Pro' }

function Dashboard({ session }) {
  const [school, setSchool] = useState(null)
  const [activeClassCount, setActiveClassCount] = useState(0)
  const [totalPupils, setTotalPupils] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [view, setView] = useState('main')
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [selectedPupilId, setSelectedPupilId] = useState(null)
  const [pupilReturnView, setPupilReturnView] = useState('main')

  const load = useCallback(async () => {
    const { data: user } = await supabase
      .from('users')
      .select('school_id, schools(id, name, school_code, tier, class_slots, language)')
      .eq('id', session.user.id)
      .maybeSingle()
    if (!user) return

    const sch = { id: user.school_id, ...user.schools }
    setSchool(sch)

    const [{ data: cls }, { data: pups }] = await Promise.all([
      supabase.from('classes').select('id, active').eq('school_id', user.school_id),
      supabase.from('pupil_profiles').select('id').eq('school_id', user.school_id),
    ])
    setActiveClassCount((cls ?? []).filter(c => c.active).length)
    setTotalPupils((pups ?? []).length)
    setLoading(false)
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  function goToPupil(id, returnTo = 'main') {
    setSelectedPupilId(id)
    setPupilReturnView(returnTo)
    setView('pupil')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function copyLink() {
    if (!school) return
    await navigator.clipboard.writeText(`https://intuited.uk/school/${school.school_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Sub-view routing ──────────────────────────────────

  if (!loading && view === 'classes') return (
    <LeadershipManageClasses
      school={school}
      onBack={() => { setView('main'); load() }}
      onSelectClass={id => { setSelectedClassId(id); setView('class') }}
    />
  )

  if (!loading && view === 'class') return (
    <LeadershipClassDetail
      classId={selectedClassId}
      onBack={() => setView('classes')}
      onSelectPupil={id => goToPupil(id, 'class')}
      onClassDeleted={() => { setView('classes'); load() }}
    />
  )

  if (!loading && view === 'pupils') return (
    <LeadershipManagePupils
      schoolId={school.id}
      onBack={() => setView('main')}
      onSelectPupil={id => goToPupil(id, 'pupils')}
    />
  )

  if (!loading && view === 'pupil') return (
    <LeadershipPupilDetail
      pupilId={selectedPupilId}
      onBack={() => setView(pupilReturnView)}
      onPupilDeleted={() => { setView(pupilReturnView); load() }}
    />
  )

  if (!loading && view === 'account') return (
    <LeadershipAccount school={school} onBack={() => setView('main')} />
  )

  if (!loading && view === 'support') return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={() => setView('main')}>← Back</button>
        <div className="dashboard-header-brand" style={{ flex: 1 }}><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>
      <main className="dashboard-main">
        <div className="page-title">
          <h1>Support</h1>
        </div>
        <section className="dashboard-section">
          <h2 style={{ marginBottom: '0.75rem' }}>Get in touch</h2>
          <p className="note" style={{ marginBottom: '0.75rem' }}>
            If you need help with anything, have a question, or want to report a problem, email us and we'll get back to you as soon as we can.
          </p>
          <a href="mailto:support@intuited.uk" className="support-email">support@intuited.uk</a>
        </section>
        <section className="dashboard-section">
          <h2 style={{ marginBottom: '0.75rem' }}>About Intuit Education</h2>
          <p className="note">Intuit Education builds digital tools for Welsh primary schools. This platform is currently in pilot.</p>
        </section>
      </main>
    </div>
  )

  // ── Main tile grid ────────────────────────────────────

  if (loading) return <div className="screen"><p>Loading...</p></div>

  const tier = school.tier ?? 'free'
  const tierLabel = TIER_LABELS[tier] ?? tier
  const slotSub = tier === 'pilot' ? 'Unlimited classes' : `${activeClassCount} class${activeClassCount !== 1 ? 'es' : ''}`
  const staffLink = `intuited.uk/school/${school.school_code}`

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-brand" style={{ flex: 1 }}><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-tiles-wrapper">
        <div className="dashboard-brand">{school.name}</div>
        <div className="dashboard-tiles">

          {/* Staff Link — content inline, no navigation */}
          <div className="dashboard-tile dashboard-tile--link">
            <div className="dashboard-tile-icon">🔗</div>
            <div className="dashboard-tile-title">Staff Link</div>
            <div className="dashboard-tile-link-row">
              <code className="dashboard-tile-code">{staffLink}</code>
              <button className="button-secondary" onClick={copyLink} style={{ flexShrink: 0 }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <button className="dashboard-tile" onClick={() => setView('classes')}>
            <div className="dashboard-tile-icon">🏫</div>
            <div className="dashboard-tile-title">Manage Classes</div>
            <div className="dashboard-tile-sub">{slotSub}</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('pupils')}>
            <div className="dashboard-tile-icon">👥</div>
            <div className="dashboard-tile-title">Manage Pupils</div>
            <div className="dashboard-tile-sub">{totalPupils} pupil{totalPupils !== 1 ? 's' : ''}</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('account')}>
            <div className="dashboard-tile-icon">⭐</div>
            <div className="dashboard-tile-title">Tier</div>
            <div className="dashboard-tile-sub">
              <span className={`tier-badge${tier !== 'free' ? ' tier-badge--pro' : ''}`}>{tierLabel}</span>
            </div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('account')}>
            <div className="dashboard-tile-icon">⚙️</div>
            <div className="dashboard-tile-title">Manage Account</div>
            <div className="dashboard-tile-sub">PIN · transfer</div>
          </button>

          <button className="dashboard-tile" onClick={() => setView('support')}>
            <div className="dashboard-tile-icon">💬</div>
            <div className="dashboard-tile-title">Support</div>
            <div className="dashboard-tile-sub">Get help</div>
          </button>

          <button className="dashboard-tile dashboard-tile--signout" onClick={handleSignOut}>
            <div className="dashboard-tile-icon">🚪</div>
            <div className="dashboard-tile-title">Sign Out</div>
          </button>

        </div>
      </main>
    </div>
  )
}

export default Dashboard
