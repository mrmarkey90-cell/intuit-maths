import { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

function NumpadModule({ question, stage, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const isCorrect = value !== null && value === question.answer
  const overlayTitle = question.column
    ? `${question.column.a} ${question.column.operator} ${question.column.b}`
    : question.question

  function handleSubmit(v) {
    setValue(v)
    setShowOverlay(false)
    onAnswer({ correct: v === question.answer })
  }

  return (
    <div className="insight-module-content">
      {question.column ? (
        <div className="insight-column-problem">
          <div className="insight-column-inner">
            <div className="insight-column-row">
              <span className="insight-column-operator" />
              <span className="insight-column-number">{question.column.a}</span>
            </div>
            <div className="insight-column-row">
              <span className="insight-column-operator">{question.column.operator}</span>
              <span className="insight-column-number">{question.column.b}</span>
            </div>
            <div className="insight-column-rule" />
          </div>
        </div>
      ) : (
        <div
          className={[
            'insight-module-question',
            question.question?.includes('\n') ? 'insight-module-question--wordproblem' : '',
          ].filter(Boolean).join(' ')}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {question.question}
        </div>
      )}

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
          question={overlayTitle}
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
