import { useTranslation } from '../i18n/LanguageContext'

function StaffClassSelect({ school, onSelect }) {
  const { t } = useTranslation()
  return (
    <div className="screen">
      <h1>{school.name}</h1>
      <p className="tagline">{t('staffClassSelect.tagline')}</p>

      {(!school.classes || school.classes.length === 0) ? (
        <p className="note">{t('staffClassSelect.noClasses')}</p>
      ) : (
        <div className="class-list">
          {school.classes.map(c => (
            <button key={c.id} className="class-select-btn" onClick={() => onSelect(c)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffClassSelect
