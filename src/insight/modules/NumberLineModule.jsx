import { useState } from 'react'

// A true ruled number line: one tick per integer, but only the two end
// values are labelled — the child has to count notches to find the
// answer rather than just read a number off a button.
function NumberLineModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const { min, max, answer } = question

  const ticks = []
  for (let v = min; v <= max; v++) ticks.push(v)

  function pct(v) {
    return ((v - min) / (max - min)) * 100
  }

  function handleTap(v) {
    if (locked) return
    setSelected(v)
    onAnswer({ correct: v === answer })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-numberline-prompt">{question.prompt}</div>
      <div className="insight-numberline-rule">
        <div className="insight-numberline-line" />
        {ticks.map(v => {
          const isEnd = v === min || v === max
          const cls = [
            'insight-numberline-tick',
            selected === v && !revealed ? 'insight-numberline-tick--selected' : '',
            revealed && v === answer ? 'insight-numberline-tick--correct' : '',
            revealed && selected === v && v !== answer ? 'insight-numberline-tick--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={v}
              className={cls}
              style={{ left: `${pct(v)}%` }}
              onClick={() => handleTap(v)}
              disabled={locked}
              aria-label={`Choose ${v}`}
            >
              <span className="insight-numberline-mark" />
              {isEnd && <span className="insight-numberline-label">{v}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NumberLineModule
