import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function PinSetup({ userData, onComplete }) {
  const { t } = useTranslation()
  const [leadershipPin, setLeadershipPin] = useState('')
  const [confirmLeadershipPin, setConfirmLeadershipPin] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [confirmStaffPin, setConfirmStaffPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const schoolUrl = `intuited.uk/school/${userData.school_code}`

  function validate() {
    if (!/^\d{4,6}$/.test(leadershipPin)) return t('pinSetup.errPinLength')
    if (leadershipPin !== confirmLeadershipPin) return t('pinSetup.errPinsDontMatch')
    if (!/^\d{4,6}$/.test(staffPin)) return t('pinSetup.errStaffPinLength')
    if (staffPin !== confirmStaffPin) return t('pinSetup.errStaffPinsDontMatch')
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.updateUser({ password: leadershipPin })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { error: rpcError } = await supabase.rpc('complete_onboarding', {
      leadership_pin: leadershipPin,
      staff_pin: staffPin,
    })
    if (rpcError) { setError(rpcError.message); setLoading(false); return }

    onComplete()
  }

  return (
    <div className="screen">
      <h1>{t('pinSetup.title')}</h1>
      <p className="tagline">{t('pinSetup.tagline')}</p>

      <div className="form">
        <p className="pin-section-label">{t('pinSetup.yourLeadershipPin')}</p>
        <p className="note" style={{ marginBottom: '0.5rem' }}>{t('pinSetup.leadershipPinNote')}</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder={t('pinSetup.enterPinPlaceholder')}
          value={leadershipPin}
          maxLength={6}
          onChange={e => { setLeadershipPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder={t('pinSetup.confirmPinPlaceholder')}
          value={confirmLeadershipPin}
          maxLength={6}
          onChange={e => { setConfirmLeadershipPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />

        <p className="pin-section-label" style={{ marginTop: '1rem' }}>{t('pinSetup.staffPin')}</p>
        <p className="note" style={{ marginBottom: '0.5rem' }}>{t('pinSetup.staffPinNote')}</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder={t('pinSetup.enterPinPlaceholder')}
          value={staffPin}
          maxLength={6}
          onChange={e => { setStaffPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder={t('pinSetup.confirmPinPlaceholder')}
          value={confirmStaffPin}
          maxLength={6}
          onChange={e => { setConfirmStaffPin(e.target.value.replace(/\D/g, '')); setError(null) }}
        />

        {error && <p className="error">{error}</p>}
      </div>

      <div className="school-link">
        <p className="note">{t('pinSetup.staffLinkLabel')}</p>
        <div className="school-link-row">
          <code>{schoolUrl}</code>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!leadershipPin || !confirmLeadershipPin || !staffPin || !confirmStaffPin || loading}
        style={{ marginTop: '2rem' }}
      >
        {loading ? t('common.saving') : t('pinSetup.goToDashboard')}
      </button>
    </div>
  )
}

export default PinSetup
