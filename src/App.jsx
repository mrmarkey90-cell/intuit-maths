import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase.from('schools').select('*')
      if (!error) {
        setConnected(true)
      } else {
        console.error(error)
      }
    }
    testConnection()
  }, [])

  return (
    <div>
      <h1>Intuit Maths Challenge</h1>
      <p>{connected ? 'Connected to Supabase ✓' : 'Connecting...'}</p>
    </div>
  )
}

export default App