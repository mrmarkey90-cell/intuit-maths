import { useState } from 'react'

// Two large tap buttons (e.g. Even / Odd, True / False) — same tap-one
// interaction as CircleModule, just bigger and styled as a binary choice
// rather than a row of options.
function TrueFalseModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(i) {
    if (locked) return
    setSelected(i)
    onAnswer({ correct: i === question.correctIndex })
  }

  return (
    <div className="insight-module-content">
      {question.prompt && <div className="insight-truefalse-prompt">{question.prompt}</div>}
      <div className="insight-truefalse-options">
        {question.options.map((opt, i) => {
          const cls = [
            'insight-truefalse-option',
            selected === i && !revealed ? 'insight-truefalse-option--selected' : '',
            revealed && i === question.correctIndex ? 'insight-truefalse-option--correct' : '',
            revealed && selected === i && i !== question.correctIndex ? 'insight-truefalse-option--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={i}
              className={cls}
              onClick={() => handleSelect(i)}
              disabled={locked}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TrueFalseModule
