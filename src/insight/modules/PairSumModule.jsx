import { useEffect, useState } from 'react'

// Choose exactly two tiles that sum to the target — any valid pair counts
function PairSumModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState([]) // indices into question.options

  const sum = selected.reduce((s, i) => s + question.options[i], 0)
  const isCorrect = selected.length === 2 && sum === question.target

  useEffect(() => {
    onAnswer({ correct: isCorrect })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  function toggle(i) {
    if (locked) return
    setSelected(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i)
      if (prev.length >= 2) return prev
      return [...prev, i]
    })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-pairsum-prompt">{question.prompt}</div>
      <div className="insight-pairsum-options">
        {question.options.map((opt, i) => {
          const isSelected = selected.includes(i)
          const cls = [
            'insight-pairsum-option',
            isSelected && !revealed ? 'insight-pairsum-option--selected' : '',
            revealed && isSelected && isCorrect ? 'insight-pairsum-option--correct' : '',
            revealed && isSelected && !isCorrect ? 'insight-pairsum-option--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={i} className={cls} onClick={() => toggle(i)} disabled={locked}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PairSumModule
