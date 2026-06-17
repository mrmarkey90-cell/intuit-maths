import { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

function NumpadModule({ question, stage, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const isCorrect = value !== null && value === question.answer

  function handleSubmit(v) {
    setValue(v)
    setShowOverlay(false)
    onAnswer({ correct: v === question.answer })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-module-question" style={{ whiteSpace: 'pre-wrap' }}>
        {question.question}
      </div>

      {revealed && !isCorrect ? (
        <div className="insight-answer-field insight-answer-field--wrong-revealed">
          {value !== null && <span className="insight-answer-wrong-val">{value}</span>}
          <span className="insight-answer-correct-val">✓ {question.answer}</span>
        </div>
      ) : (
        <button
          className={[
            'insight-answer-field',
            value !== null && !revealed ? 'insight-answer-field--filled' : '',
            revealed && isCorrect ? 'insight-answer-field--correct' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => { if (!locked) setShowOverlay(true) }}
          disabled={locked}
        >
          {value === null ? t('insight.tapToAnswer') : value}
        </button>
      )}

      {showOverlay && (
        <InsightNumpadOverlay
          question={question.question}
          stage={stage}
          initialValue={value ?? ''}
          onSubmit={handleSubmit}
          onDismiss={() => setShowOverlay(false)}
        />
      )}
    </div>
  )
}

export default NumpadModule
