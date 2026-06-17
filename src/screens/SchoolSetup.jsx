import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function SchoolSetup({ session, onComplete }) {
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { language, setLanguage, t } = useTranslation()

  async function handleSubmit() {
    if (!schoolName.trim()) return
    setLoading(true)
    setError(null)

    const code = schoolName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
      + Math.floor(10 + Math.random() * 90)

    const { data: school, error: schoolError } = await supabase
      .rpc('create_school', {
        school_name: schoolName,
        school_code: code,
        p_language: language,
      })

    if (schoolError) {
      setError(schoolError.message)
      setLoading(false)
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: session.user.id,
        name: session.user.email,
        email: session.user.email,
        role: 'leadership',
        school_id: school.id
      })

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    onComplete(school.id, code)
  }

  return (
    <div className="screen">
      <div className="language-toggle">
        <button
          className={`language-toggle-btn${language === 'en' ? ' language-toggle-btn--active' : ''}`}
          onClick={() => setLanguage('en')}
        >
          English
        </button>
        <button
          className={`language-toggle-btn${language === 'cy' ? ' language-toggle-btn--active' : ''}`}
          onClick={() => setLanguage('cy')}
        >
          Cymraeg
        </button>
      </div>

      <h1>{t('schoolSetup.title')}</h1>
      <p className="tagline">{t('schoolSetup.subtitle')}</p>

      <div className="form">
        <input
          type="text"
          placeholder={t('schoolSetup.namePlaceholder')}
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button onClick={handleSubmit} disabled={!schoolName.trim() || loading}>
          {loading ? t('schoolSetup.settingUp') : t('common.continue')}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}

export default SchoolSetup
