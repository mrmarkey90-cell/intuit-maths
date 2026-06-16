import { useState } from 'react'

// Tap-to-place on a notch — more reliable than drag gestures on touch devices
function NumberLineModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState(null)

  const ticks = []
  for (let v = question.min; v <= question.max; v++) ticks.push(v)

  function handleTap(v) {
    if (locked || selected !== null) return
    setSelected(v)
    onAnswer({ correct: v === question.answer })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-numberline-prompt">{question.prompt}</div>
      <div className="insight-numberline-track">
        {ticks.map(v => {
          const cls = [
            'insight-numberline-tick',
            selected === v && !revealed ? 'insight-numberline-tick--selected' : '',
            revealed && v === question.answer ? 'insight-numberline-tick--correct' : '',
            revealed && selected === v && v !== question.answer ? 'insight-numberline-tick--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={v} className={cls} onClick={() => handleTap(v)} disabled={locked || selected !== null}>
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NumberLineModule
