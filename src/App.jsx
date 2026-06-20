import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './App.css'
import { LanguageProvider, useTranslation } from './i18n/LanguageContext'
import FloatingLogos from './components/FloatingLogos'
import Landing from './screens/Landing'
import SchoolSetup from './screens/SchoolSetup'
import Payment from './screens/Payment'
import AddClasses from './screens/AddClasses'
import PinSetup from './screens/PinSetup'
import Dashboard from './screens/Dashboard'
import StaffLogin from './screens/StaffLogin'
import StaffClassSelect from './screens/StaffClassSelect'
import StaffClassDashboard from './screens/StaffClassDashboard'
import PupilJoin from './screens/PupilJoin'
import PupilSession from './screens/session/PupilSession'
import PupilHub from './screens/PupilHub'
import InsightTest from './screens/InsightTest'
import InstinctTest from './screens/InstinctTest'
import AvatarTest from './screens/AvatarTest'
import PupilScreenGuard from './components/PupilScreenGuard'

function LeadershipApp() {
  const [session, setSession] = useState(null)
  const [userData, setUserData] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)
  const { setLanguage } = useTranslation()

  useEffect(() => {
    if (!userData?.school_id) return
    supabase.from('schools').select('language').eq('id', userData.school_id).maybeSingle()
      .then(({ data }) => { if (data?.language) setLanguage(data.language) })
  }, [userData?.school_id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (data) {
      setUserData({ school_id: data.school_id, onboarding_complete: data.onboarding_complete })
      setLoading(false)
    } else {
      // No user row — could be a completed ownership transfer
      const { data: transfer } = await supabase.rpc('complete_transfer')
      if (transfer?.ok) {
        // Row now exists under the new auth UID — re-check
        checkUser(userId)
      } else {
        // Normal new signup
        setUserData(null)
        setLoading(false)
      }
    }
  }

  if (loading) return <div className="screen"><p>Loading...</p></div>
  if (!session) return <><FloatingLogos /><Landing /></>
  if (!userData) return (
    <><FloatingLogos /><SchoolSetup
      session={session}
      onComplete={(id) => {
        setUserData({ school_id: id, onboarding_complete: false })
        setOnboarding('payment')
      }}
    /></>
  )
  if (onboarding === 'payment') return (
    <><FloatingLogos /><Payment
      onFree={() => setOnboarding('classes')}
      onPaid={() => setOnboarding('classes')}
    /></>
  )
  if (onboarding === 'classes') return (
    <><FloatingLogos /><AddClasses
      userData={userData}
      onComplete={() => setOnboarding('pin')}
    /></>
  )
  if (onboarding === 'pin') return (
    <><FloatingLogos /><PinSetup
      userData={userData}
      onComplete={() => {
        setUserData(d => ({ ...d, onboarding_complete: true }))
        setOnboarding(null)
      }}
    /></>
  )
  if (!userData.onboarding_complete) return (
    <><FloatingLogos /><Payment
      onFree={() => setOnboarding('classes')}
      onPaid={() => setOnboarding('classes')}
    /></>
  )
  return <><FloatingLogos /><Dashboard session={session} /></>
}

function StaffApp() {
  const [staffSchool, setStaffSchool] = useState(null)
  const [staffClass, setStaffClass] = useState(null)
  const { setLanguage } = useTranslation()

  if (!staffSchool) return (
    <>
      <FloatingLogos />
      <StaffLogin
        onSuccess={school => {
          localStorage.setItem('staffSession', JSON.stringify(school))
          if (school?.language) setLanguage(school.language)
          setStaffSchool(school)
        }}
      />
    </>
  )
  if (!staffClass) return (
    <>
      <FloatingLogos />
      <StaffClassSelect school={staffSchool} onSelect={setStaffClass} />
    </>
  )
  return (
    <>
      <FloatingLogos />
      <StaffClassDashboard
        school={staffSchool}
        cls={staffClass}
        onChangeClass={() => setStaffClass(null)}
        onSignOut={() => {
          localStorage.removeItem('staffSession')
          setStaffSchool(null)
          setStaffClass(null)
        }}
      />
    </>
  )
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:code" element={<PupilScreenGuard><PupilJoin /></PupilScreenGuard>} />
          <Route path="/play/:code" element={<PupilScreenGuard><PupilSession /></PupilScreenGuard>} />
          <Route path="/hub/:joinCode" element={<PupilScreenGuard><PupilHub /></PupilScreenGuard>} />
          <Route path="/school/:code" element={<StaffApp />} />
          <Route path="/insight-test" element={<InsightTest />} />
          <Route path="/instinct-test" element={<InstinctTest />} />
          <Route path="/avatar-test" element={<AvatarTest />} />
          <Route path="/*" element={<LeadershipApp />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
