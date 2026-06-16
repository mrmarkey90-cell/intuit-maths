import { useEffect, useState } from 'react'

function findCorrectPair(options, target) {
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (options[i] + options[j] === target) return [i, j]
    }
  }
  return []
}

// Choose exactly two tiles that sum to the target — any valid pair counts
function PairSumModule({ question, locked, revealed, onAnswer }) {
  const [selected, setSelected] = useState([]) // indices into question.options

  const sum = selected.reduce((s, i) => s + question.options[i], 0)
  const isCorrect = selected.length === 2 && sum === question.target
  const correctPair = !isCorrect ? findCorrectPair(question.options, question.target) : []

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
          let cls = 'insight-pairsum-option'
          if (isSelected && !revealed) cls += ' insight-pairsum-option--selected'
          if (revealed) {
            if (isCorrect && isSelected) cls += ' insight-pairsum-option--correct'
            else if (!isCorrect && correctPair.includes(i)) cls += ' insight-pairsum-option--correct'
            else if (!isCorrect && isSelected) cls += ' insight-pairsum-option--wrong'
          }
          return (
            <button key={i} className={cls} onClick={() => toggle(i)} disabled={locked}>
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && !isCorrect && (
        <div className="insight-correct-hint">
          {question.options[correctPair[0]]} + {question.options[correctPair[1]]} = {question.target}
        </div>
      )}
    </div>
  )
}

export default PairSumModule
