import { useState } from 'react'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Tap-to-swap reordering — more reliable than drag gestures on touch devices
function DragSortModule({ question, locked, revealed, onAnswer }) {
  const [order, setOrder] = useState(() => shuffle(question.values))
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const correctOrder = [...question.values].sort((a, b) => a - b)
  const isCorrect = order.every((v, i) => v === correctOrder[i])

  function tapTile(i) {
    if (locked || submitted) return
    if (selectedIdx === null) { setSelectedIdx(i); return }
    if (selectedIdx === i) { setSelectedIdx(null); return }
    const next = [...order]
    ;[next[selectedIdx], next[i]] = [next[i], next[selectedIdx]]
    setOrder(next)
    setSelectedIdx(null)
  }

  function submit() {
    setSubmitted(true)
    onAnswer({ correct: isCorrect })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-dragsort-prompt">{question.prompt}</div>
      <div className="insight-dragsort-row">
        {order.map((v, i) => {
          const cls = [
            'insight-dragsort-tile',
            selectedIdx === i ? 'insight-dragsort-tile--selected' : '',
            revealed && isCorrect ? 'insight-dragsort-tile--correct' : '',
            revealed && !isCorrect ? 'insight-dragsort-tile--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={i} className={cls} onClick={() => tapTile(i)} disabled={locked || submitted}>
              {v}
            </button>
          )
        })}
      </div>

      {!submitted ? (
        <button className="insight-answer-field" onClick={submit} disabled={locked}>
          Submit order
        </button>
      ) : revealed && !isCorrect ? (
        <div className="insight-answer-field insight-answer-field--wrong-revealed">
          <span className="insight-answer-correct-val">Correct: {correctOrder.join(', ')}</span>
        </div>
      ) : (
        <div className="insight-answer-field insight-answer-field--filled">Submitted</div>
      )}
    </div>
  )
}

export default DragSortModule
