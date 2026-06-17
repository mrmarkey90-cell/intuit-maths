import { useState } from 'react'

function NumberLineModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState(null)

  const ticks = []
  for (let v = question.min; v <= question.max; v++) ticks.push(v)

  // Balance ticks evenly across rows (e.g. 11 ticks -> 6+5, not a lopsided
  // 7+4) instead of letting flex-wrap greedily fill the first row.
  const maxPerRow = 6
  const rowCount = Math.ceil(ticks.length / maxPerRow)
  const columns = Math.ceil(ticks.length / rowCount)

  function handleTap(v) {
    if (locked) return
    setSelected(v)
    onAnswer({ correct: v === question.answer })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-numberline-prompt">{question.prompt}</div>
      <div className="insight-numberline-track" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {ticks.map(v => {
          const cls = [
            'insight-numberline-tick',
            selected === v && !revealed ? 'insight-numberline-tick--selected' : '',
            revealed && v === question.answer ? 'insight-numberline-tick--correct' : '',
            revealed && selected === v && v !== question.answer ? 'insight-numberline-tick--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={v} className={cls} onClick={() => handleTap(v)} disabled={locked}>
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NumberLineModule
