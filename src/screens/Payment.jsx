import { useTranslation } from '../i18n/LanguageContext'

function Payment({ onFree, onPaid }) {
  const { t } = useTranslation()
  return (
    <div className="screen">
      <h1>{t('payment.title')}</h1>
      <p className="tagline">{t('payment.tagline')}</p>

      <div className="plan-grid">
        <div className="plan-card">
          <h2>{t('payment.freeTitle')}</h2>
          <p className="plan-price">£0</p>
          <ul className="plan-features">
            <li>{t('payment.featureOneClass')}</li>
            <li>{t('payment.featureUpTo40Pupils')}</li>
            <li>{t('payment.featureFullInstinct')}</li>
            <li>{t('payment.featurePerPupilReporting')}</li>
          </ul>
          <button onClick={onFree}>{t('payment.startFree')}</button>
        </div>

        <div className="plan-card plan-card--featured">
          <h2>{t('payment.schoolTitle')}</h2>
          <p className="plan-price">£125<span>{t('payment.perYear')}</span></p>
          <ul className="plan-features">
            <li>{t('payment.featureUnlimitedClasses')}</li>
            <li>{t('payment.featureUnlimitedPupils')}</li>
            <li>{t('payment.featureFullInstinct')}</li>
            <li>{t('payment.featureWholeSchoolReporting')}</li>
          </ul>
          <button disabled>{t('payment.comingSoon')}</button>
        </div>
      </div>

      <p className="privacy">{t('payment.privacy')}</p>
    </div>
  )
}

export default Payment