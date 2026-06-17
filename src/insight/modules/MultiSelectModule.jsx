import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

// Grid of tiles, tap to toggle any number of them on/off. No internal
// submit — like every other module, onAnswer just reflects whatever is
// currently selected, and the child moves on with the carousel's own
// Next button whenever they're happy with their selection.
function MultiSelectModule({ question, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(new Set())
  const correctSet = new Set(question.correctIndices)
  const isCorrect = selected.size === correctSet.size && [...selected].every(i => correctSet.has(i))

  useEffect(() => {
    onAnswer({ correct: isCorrect })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  function toggle(i) {
    if (locked) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="insight-module-content">
      <div className="insight-multiselect-prompt">{question.prompt}</div>
      <div className="insight-multiselect-grid">
        {question.options.map((opt, i) => {
          const isSelected = selected.has(i)
          const cls = [
            'insight-multiselect-option',
            isSelected && !revealed ? 'insight-multiselect-option--selected' : '',
            revealed && correctSet.has(i) ? 'insight-multiselect-option--correct' : '',
            revealed && !correctSet.has(i) && isSelected ? 'insight-multiselect-option--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={i} className={cls} onClick={() => toggle(i)} disabled={locked}>
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && !isCorrect && (
        <div className="insight-correct-hint">
          {t('insight.correct')} {question.correctIndices.map(i => question.options[i]).join(', ')}
        </div>
      )}
    </div>
  )
}

export default MultiSelectModule
