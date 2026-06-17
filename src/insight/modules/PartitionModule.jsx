import { useState } from 'react'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

// Shows the number itself with arrows down to one numpad box per part —
// no words, just the number splitting into "(X + Y)" boxes, so it reads
// the same regardless of language. Both boxes must be filled in; there's
// no single hidden slot.
function PartitionModule({ question, stage, locked, revealed, onAnswer }) {
  const { number, parts } = question
  const [values, setValues] = useState(() => parts.map(() => null))
  const [activeBox, setActiveBox] = useState(null)

  function handleSubmit(v) {
    const next = [...values]
    next[activeBox] = Number(v)
    setValues(next)
    setActiveBox(null)
    if (next.every(x => x !== null)) {
      onAnswer({ correct: next.every((x, i) => x === parts[i]) })
    }
  }

  const overlayQuestion = activeBox === null
    ? ''
    : parts.map((p, i) => (i === activeBox ? '?' : (values[i] ?? '?'))).join(' + ')

  return (
    <div className="insight-module-content">
      <div className="insight-partition-number">{number}</div>

      <div className="insight-partition-arrows">
        {parts.map((_, i) => <span key={i} className="insight-partition-arrow">↓</span>)}
      </div>

      <div className="insight-partition-row">
        {parts.map((p, i) => {
          const filled = values[i] !== null
          const cls = [
            'insight-partition-box',
            filled && !revealed ? 'insight-partition-box--filled' : '',
            revealed && values[i] === p ? 'insight-partition-box--correct' : '',
            revealed && values[i] !== p ? 'insight-partition-box--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <span key={i} className="insight-partition-group">
              {i > 0 && <span className="insight-partition-plus">+</span>}
              <button className={cls} onClick={() => { if (!locked) setActiveBox(i) }} disabled={locked}>
                {values[i] ?? ''}
              </button>
            </span>
          )
        })}
      </div>

      {revealed && !parts.every((p, i) => values[i] === p) && (
        <div className="insight-correct-hint">Correct: {parts.join(' + ')}</div>
      )}

      {activeBox !== null && (
        <InsightNumpadOverlay
          question={overlayQuestion}
          stage={stage}
          initialValue={values[activeBox] ?? ''}
          onSubmit={handleSubmit}
          onDismiss={() => setActiveBox(null)}
        />
      )}
    </div>
  )
}

export default PartitionModule
