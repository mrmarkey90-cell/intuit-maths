import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function AddClasses({ userData, onComplete }) {
  const { t } = useTranslation()
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
      <h1>{t('addClasses.title')}</h1>
      <p className="tagline">
        {isFree ? t('addClasses.taglineFree') : t('addClasses.taglinePaid')}
      </p>

      <div className="form">
        <input
          type="text"
          placeholder={t('addClasses.namePlaceholder')}
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addClass()}
          disabled={atLimit}
        />
        <button onClick={addClass} disabled={!className.trim() || loading || atLimit}>
          {loading ? t('addClasses.adding') : t('addClasses.addClass')}
        </button>
        {atLimit && <p className="note">{t('addClasses.limitReached')}</p>}
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
        {t('common.continue')}
      </button>
    </div>
  )
}

export default AddClasses