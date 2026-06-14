import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Payment from './screens/Payment'
import Dashboard from './screens/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [school, setSchool] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkSchool(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkSchool(session.user.id)
      else setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkSchool(userId) {
    const { data } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle()
    setSchool(data?.school_id || null)
    setLoading(false)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!session) return <Landing />
  if (!school && onboarding !== 'payment') return (
    <SchoolSetup
      session={session}
      onComplete={(id) => {
        setSchool(id)
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
  return <Dashboard session={session} />
}

export default App