import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Payment from './screens/Payment'
import AddClasses from './screens/AddClasses'
import PinSetup from './screens/PinSetup'
import Dashboard from './screens/Dashboard'

function App() {
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