import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Dashboard from './screens/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkSchool(session.user.id)
      else setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkSchool(session.user.id)
      else setLoading(false)
    })
  }, [])

  async function checkSchool(userId) {
    const { data } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .single()
    setSchool(data?.school_id || null)
    setLoading(false)
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!session) return <Landing />
  if (!school) return <SchoolSetup session={session} onComplete={(id) => setSchool(id)} />
  return <Dashboard session={session} />
}

export default App