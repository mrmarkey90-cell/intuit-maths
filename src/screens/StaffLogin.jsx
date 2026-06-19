import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function StaffLogin({ onSuccess }) {
  const { code: schoolCode } = useParams()
  const [schoolName, setSchoolName] = useState(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { t, setLanguage } = useTranslation()

  useEffect(() => {
    supabase.rpc('get_school_name', { p_school_code: schoolCode })
      .then(({ data }) => {
        setSchoolName(data?.name)
        if (data?.language) setLanguage(data.language)
      })
  }, [schoolCode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!pin) return
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('verify_school_pin', {
      p_school_code: schoolCode,
      p_pin: pin,
    })

    if (rpcError) {
      setError(rpcError.message === 'Incorrect PIN' ? t('staffLogin.incorrectPin') : t('staffLogin.schoolNotFound'))
      setLoading(false)
      return
    }

    onSuccess(data)
  }

  return (
    <div className="screen staff-screen">
      <h1>{schoolName ?? schoolCode}</h1>
      <p className="tagline">{t('staffLogin.subtitle')}</p>

      <div className="form">
        <input
          type="password"
          inputMode="numeric"
          placeholder={t('staffLogin.pinPlaceholder')}
          value={pin}
          maxLength={6}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleSubmit} disabled={!pin || loading}>
          {loading ? t('staffLogin.checking') : t('staffLogin.enter')}
        </button>
      </div>
    </div>
  )
}

export default StaffLogin
