import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Payment from './screens/Payment'
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
      .select('school_id, onboarding_complete')
      .eq('id', userId)
      .maybeSingle()
    setUserData(data || null)
    setLoading(false)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!session) return <Landing />
  if (!userData) return (
    <SchoolSetup
      session={session}
      onComplete={(id) => {
        setUserData({ school_id: id, onboarding_complete: false })
        setOnboarding('payment')
      }}
    />
  )
  if (!userData.onboarding_complete || onboarding === 'payment') return (
    <Payment
      onFree={() => setOnboarding('classes')}
      onPaid={() => setOnboarding('classes')}
    />
  )
  if (onboarding === 'classes') return (
    <div className="screen"><h1>Add classes</h1></div>
  )
  return <Dashboard session={session} />
}

export default App