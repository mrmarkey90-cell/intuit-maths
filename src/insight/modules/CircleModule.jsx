import { useState } from 'react'

function CircleModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(i) {
    if (locked || selected !== null) return
    setSelected(i)
    onAnswer({ correct: i === question.correctIndex })
  }

  return (
    <div className="insight-module-content">
      {question.prompt && <div className="insight-circle-prompt">{question.prompt}</div>}
      <div className="insight-circle-options">
        {question.options.map((opt, i) => {
          const cls = [
            'insight-circle-option',
            selected === i && !revealed ? 'insight-circle-option--selected' : '',
            revealed && i === question.correctIndex ? 'insight-circle-option--correct' : '',
            revealed && selected === i && i !== question.correctIndex ? 'insight-circle-option--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={i}
              className={cls}
              onClick={() => handleSelect(i)}
              disabled={locked || selected !== null}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CircleModule
