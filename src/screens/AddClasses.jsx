import { useState } from 'react'
import { supabase } from '../supabaseClient'

function AddClasses({ userData, onComplete }) {
  const [className, setClassName] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isFree = !userData.subscribed
  const atLimit = isFree && classes.length >= 1

  async function addClass() {
    if (!className.trim() || atLimit) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('classes')
      .insert({ name: className.trim(), school_id: userData.school_id })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setClasses([...classes, data])
      setClassName('')
    }
    setLoading(false)
  }

  return (
    <div className="screen">
      <h1>Add your classes</h1>
      <p className="tagline">
        {isFree
          ? 'Free plan includes one class. Upgrade for unlimited.'
          : 'Add as many classes as you need.'}
      </p>

      <div className="form">
        <input
          type="text"
          placeholder="Class name (e.g. Year 4, Dosbarth Melyn)"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClass()}
          disabled={atLimit}
        />
        <button onClick={addClass} disabled={!className.trim() || loading || atLimit}>
          {loading ? 'Adding...' : 'Add class'}
        </button>
        {atLimit && <p className="note">Free plan limit reached. Upgrade for unlimited classes.</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {classes.length > 0 && (
        <div className="class-list">
          {classes.map(c => (
            <div key={c.id} className="class-item">
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={classes.length === 0}
        style={{ marginTop: '2rem' }}
      >
        Continue
      </button>
    </div>
  )
}

export default AddClasses