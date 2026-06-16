import { useState } from 'react'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

function NumpadModule({ question, stage, locked, revealed, onAnswer }) {
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
      <div className="insight-module-question" style={{ whiteSpace: 'pre' }}>
        {question.question}
      </div>

      {revealed && value !== null && !isCorrect ? (
        <div className="insight-answer-field insight-answer-field--wrong-revealed">
          <span className="insight-answer-wrong-val">{value}</span>
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
          {value === null ? 'Tap to answer' : value}
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
