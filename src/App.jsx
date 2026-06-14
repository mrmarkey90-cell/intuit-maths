import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Payment from './screens/Payment'
import AddClasses from './screens/AddClasses'
import PinSetup from './screens/PinSetup'
import Dashboard from './screens/Dashboard'
import StaffLogin from './screens/StaffLogin'
import StaffClassSelect from './screens/StaffClassSelect'

const STAFF_PATH = /^\/school\/([A-Z0-9]+)$/i

function App() {
  const staffMatch = STAFF_PATH.exec(window.location.pathname)
  const staffSchoolCode = staffMatch ? staffMatch[1].toUpperCase() : null

  const [staffSchool, setStaffSchool] = useState(() => {
    if (!staffSchoolCode) return null
    try {
      const stored = JSON.parse(localStorage.getItem('staffSession') || 'null')
      return stored?.school_code === staffSchoolCode ? stored : null
    } catch { return null }
  })
  const [staffClass, setStaffClass] = useState(null)

  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkUser(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkUser(session.user.id)
      else setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkUser(userId) {
    const { data } = await supabase
      .from('users')
      .select('school_id, onboarding_complete, schools(subscribed, school_code)')
      .eq('id', userId)
      .maybeSingle()
    if (data) {
      setUserData({
        school_id: data.school_id,
        onboarding_complete: data.onboarding_complete,
        subscribed: data.schools?.subscribed ?? false,
        school_code: data.schools?.school_code ?? null,
      })
    } else {
      setUserData(null)
    }
    setLoading(false)
  }

  if (staffSchoolCode) {
    if (!staffSchool) return (
      <StaffLogin
        schoolCode={staffSchoolCode}
        onSuccess={school => {
          localStorage.setItem('staffSession', JSON.stringify(school))
          setStaffSchool(school)
        }}
      />
    )
    if (!staffClass) return (
      <StaffClassSelect school={staffSchool} onSelect={setStaffClass} />
    )
    return <div className="screen"><p>Class dashboard coming soon — {staffClass.name}</p></div>
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!session) return <Landing />
  if (!userData) return (
    <SchoolSetup
      session={session}
      onComplete={(id, schoolCode) => {
        setUserData({ school_id: id, school_code: schoolCode, onboarding_complete: false, subscribed: false })
        setOnboarding('payment')
      }}
    />
  )
  if (onboarding === 'payment') return (
    <Payment
      onFree={() => setOnboarding('classes')}
      onPaid={() => setOnboarding('classes')}
    />
  )
  if (onboarding === 'classes') return (
    <AddClasses
      userData={userData}
      onComplete={() => setOnboarding('pin')}
    />
  )
  if (onboarding === 'pin') return (
    <PinSetup
      userData={userData}
      onComplete={() => {
        setUserData(d => ({ ...d, onboarding_complete: true }))
        setOnboarding(null)
      }}
    />
  )
  if (!userData.onboarding_complete) return (
    <Payment
      onFree={() => setOnboarding('classes')}
      onPaid={() => setOnboarding('classes')}
    />
  )
  return <Dashboard session={session} />
}

export default App