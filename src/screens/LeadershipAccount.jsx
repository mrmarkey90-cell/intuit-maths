import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

const TIER_LABELS = { free: 'Free', pilot: 'Pilot', paid: 'Pro' }

function LeadershipAccount({ school, onBack }) {
  const { language, setLanguage, t } = useTranslation()
  const [savingLanguage, setSavingLanguage] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState(null)
  const [pinSuccess, setPinSuccess] = useState(false)

  const [transferring, setTransferring] = useState(false)
  const [transferPin, setTransferPin] = useState('')
  const [transferEmail, setTransferEmail] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState(null)
  const [transferSent, setTransferSent] = useState(false)

  async function handleChangePin() {
    if (!oldPin) { setPinError(t('account.errEnterLeadershipPin')); return }
    if (!/^\d{4,6}$/.test(newPin)) { setPinError(t('account.errPinLength')); return }
    if (newPin !== confirmPin) { setPinError(t('account.errPinsDontMatch')); return }
    setPinLoading(true)
    setPinError(null)
    const { error } = await supabase.rpc('set_staff_pin', { leadership_pin: oldPin, new_staff_pin: newPin })
    if (error) {
      setPinError(error.message === 'Incorrect PIN' ? t('account.errLeadershipPinIncorrect') : error.message)
      setPinLoading(false)
      return
    }
    setChangingPin(false)
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinSuccess(true)
    setTimeout(() => setPinSuccess(false), 3000)
    setPinLoading(false)
  }

  function cancelPin() {
    setChangingPin(false)
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinError(null)
  }

  async function handleTransfer() {
    if (!/^\d{4,6}$/.test(transferPin)) { setTransferError(t('account.errEnterLeadershipPin')); return }
    if (!transferEmail.includes('@')) { setTransferError(t('account.errInvalidEmail')); return }
    setTransferLoading(true)
    setTransferError(null)
    const { data } = await supabase.rpc('initiate_transfer', {
      p_leadership_pin: transferPin,
      p_new_email: transferEmail.toLowerCase().trim(),
    })
    if (data?.error === 'wrong_pin') { setTransferError(t('account.errLeadershipPinIncorrect')); setTransferLoading(false); return }
    if (data?.error) { setTransferError(t('account.errGeneric')); setTransferLoading(false); return }
    await supabase.auth.signInWithOtp({ email: transferEmail.toLowerCase().trim() })
    setTransferLoading(false)
    setTransferSent(true)
  }

  function cancelTransfer() {
    setTransferring(false)
    setTransferPin(''); setTransferEmail('')
    setTransferError(null); setTransferSent(false)
  }

  async function handleLanguageChange(lang) {
    if (lang === language || savingLanguage) return
    setSavingLanguage(true)
    setLanguage(lang)
    await supabase.rpc('set_school_language', { p_language: lang })
    setSavingLanguage(false)
  }

  const tier = school.tier ?? 'free'

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack} aria-label={t('common.back')}>←</button>
        <div className="dashboard-header-left" style={{ marginLeft: '1rem' }}>
          <h1>{t('account.title')}</h1>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('account.language')}</h2>
          </div>
          <p className="note">{t('account.languageNote')}</p>
          <div className="language-toggle" style={{ marginTop: '0.75rem', marginBottom: 0, display: 'inline-flex' }}>
            <button
              className={`language-toggle-btn${language === 'en' ? ' language-toggle-btn--active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              disabled={savingLanguage}
            >
              English
            </button>
            <button
              className={`language-toggle-btn${language === 'cy' ? ' language-toggle-btn--active' : ''}`}
              onClick={() => handleLanguageChange('cy')}
              disabled={savingLanguage}
            >
              Cymraeg
            </button>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('account.subscription')}</h2>
            <span className={`tier-badge${tier !== 'free' ? ' tier-badge--pro' : ''}`}>
              {TIER_LABELS[tier] ?? tier}
            </span>
          </div>
          {tier === 'free' && (
            <p className="note">{t('account.tierFree')}</p>
          )}
          {tier === 'pilot' && (
            <p className="note">{t('account.tierPilot')}</p>
          )}
          {tier === 'paid' && (
            <p className="note">{t('account.tierPaid').replace('{n}', school.class_slots)}</p>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('account.staffPin')}</h2>
            {!changingPin && (
              <button className="button-secondary" onClick={() => setChangingPin(true)}>{t('account.changePin')}</button>
            )}
          </div>
          <p className="note">{t('account.staffPinNote')}</p>
          {pinSuccess && <p className="success" style={{ marginTop: '0.75rem' }}>{t('account.pinUpdated')}</p>}
          {changingPin && (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <input type="password" inputMode="numeric" placeholder={t('account.yourLeadershipPin')}
                value={oldPin} maxLength={6}
                onChange={e => { setOldPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              <input type="password" inputMode="numeric" placeholder={t('account.newStaffPin')}
                value={newPin} maxLength={6}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              <input type="password" inputMode="numeric" placeholder={t('account.confirmNewPin')}
                value={confirmPin} maxLength={6}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError(null) }} />
              {pinError && <p className="error">{pinError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleChangePin} disabled={!oldPin || !newPin || !confirmPin || pinLoading}>
                  {pinLoading ? t('common.saving') : t('account.savePin')}
                </button>
                <button className="button-secondary" onClick={cancelPin}>{t('common.cancel')}</button>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('account.transferOwnership')}</h2>
            {!transferring && !transferSent && (
              <button className="button-secondary" onClick={() => setTransferring(true)}>{t('account.transfer')}</button>
            )}
          </div>
          <p className="note">{t('account.transferNote')}</p>
          {transferSent ? (
            <div style={{ marginTop: '1rem' }}>
              <p className="success">{t('account.magicLinkSent')} <strong>{transferEmail}</strong>.</p>
              <p className="note" style={{ marginTop: '0.5rem' }}>{t('account.newOwnerMustClick')}</p>
              <button className="button-secondary" style={{ marginTop: '1rem' }} onClick={cancelTransfer}>{t('account.cancelTransfer')}</button>
            </div>
          ) : transferring ? (
            <div className="form" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <p className="note" style={{ color: '#b91c1c' }}>
                {t('account.transferWarning')}
              </p>
              <input type="password" inputMode="numeric" placeholder={t('account.yourLeadershipPin')}
                value={transferPin} maxLength={6}
                onChange={e => { setTransferPin(e.target.value.replace(/\D/g, '')); setTransferError(null) }} />
              <input type="email" placeholder={t('account.newOwnerEmail')}
                value={transferEmail}
                onChange={e => { setTransferEmail(e.target.value); setTransferError(null) }} />
              {transferError && <p className="error">{transferError}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleTransfer} disabled={!transferPin || !transferEmail || transferLoading}>
                  {transferLoading ? t('account.sending') : t('account.sendTransferLink')}
                </button>
                <button className="button-secondary" onClick={cancelTransfer}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default LeadershipAccount
