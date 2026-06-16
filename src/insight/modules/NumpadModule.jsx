import { useState } from 'react'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

function NumpadModule({ question, stage, locked, revealed, onAnswer }) {
  const [pupilAnswer, setPupilAnswer] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const isCorrect = pupilAnswer !== null && pupilAnswer === question.answer

  function handleSubmit(value) {
    setPupilAnswer(value)
    setShowOverlay(false)
    onAnswer({ correct: value === question.answer })
  }

  const answered = pupilAnswer !== null

  return (
    <div className="insight-module-content">
      <div className="insight-module-question" style={{ whiteSpace: 'pre' }}>
        {question.question}
      </div>

      {revealed && answered && !isCorrect ? (
        <div className="insight-answer-field insight-answer-field--wrong-revealed">
          <span className="insight-answer-wrong-val">{pupilAnswer}</span>
          <span className="insight-answer-correct-val">✓ {question.answer}</span>
        </div>
      ) : (
        <button
          className={[
            'insight-answer-field',
            answered && !revealed ? 'insight-answer-field--filled' : '',
            revealed && isCorrect ? 'insight-answer-field--correct' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => { if (!locked && !answered) setShowOverlay(true) }}
          disabled={locked || answered}
        >
          {!answered && 'Tap to answer'}
          {answered && !revealed && pupilAnswer}
          {answered && revealed && isCorrect && `✓ ${pupilAnswer}`}
        </button>
      )}

      {showOverlay && (
        <InsightNumpadOverlay
          question={question.question}
          stage={stage}
          onSubmit={handleSubmit}
          onDismiss={() => setShowOverlay(false)}
        />
      )}
    </div>
  )
}

export default NumpadModule
