import { useTranslation } from '../i18n/LanguageContext'
import { SECURITY_QUESTION_CATEGORIES } from '../lib/securityQuestions'

// 9 options equally spaced in a circle around the prompt. Positions are
// computed as real x/y percentages from the center via plain trigonometry,
// not nested CSS rotation -- the avatar arm-rig work already found CSS
// transform-based rotation silently fails to visibly rotate at larger
// angles, so anything angle-dependent in this codebase computes real
// coordinates instead (the centering translate(-50%,-50%) below is a
// fixed, angle-independent self-centering offset, not a rotation, so it
// doesn't carry that same risk).
const RADIUS_PERCENT = 38

function SecurityQuestionCircle({ categoryKey, onAnswer }) {
  const { t } = useTranslation()
  const options = SECURITY_QUESTION_CATEGORIES[categoryKey].options

  return (
    <div className="security-question-circle">
      <div className="security-question-prompt">{t(`securityQuestions.${categoryKey}.prompt`)}</div>

      {options.map((opt, i) => {
        const angle = (i / options.length) * 2 * Math.PI - Math.PI / 2
        const x = Math.cos(angle) * RADIUS_PERCENT
        const y = Math.sin(angle) * RADIUS_PERCENT
        const label = t(`securityQuestions.${categoryKey}.${opt.key}`)
        return (
          <div
            key={opt.key}
            className="security-question-option-wrap"
            style={{ left: `calc(50% + ${x}%)`, top: `calc(50% + ${y}%)` }}
          >
            <button
              className="security-question-option"
              onClick={() => onAnswer(opt.key)}
              aria-label={label}
            >
              <span className="security-question-option-emoji">{opt.emoji}</span>
            </button>
            <span className="security-question-option-label">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default SecurityQuestionCircle
