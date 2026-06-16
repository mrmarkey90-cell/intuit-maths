import { useState } from 'react'
import { DOMAIN_CONFIG } from './domainConfig'
import { generateInsightQuestion } from './generators/index'
import NumpadModule from './modules/NumpadModule'

const IMPLEMENTED_TYPES = new Set(['numpad'])

function InsightModule({ domain, stage, onAnswer, locked, revealed }) {
  const config = DOMAIN_CONFIG[domain] ?? { label: domain, moduleType: 'unknown', stage: 1 }
  const [question] = useState(() => generateInsightQuestion(domain))
  const [answerState, setAnswerState] = useState(null) // null | 'correct' | 'wrong'

  function handleAnswer({ correct }) {
    setAnswerState(correct ? 'correct' : 'wrong')
    onAnswer({ correct, domain })
  }

  const cardClass = [
    'insight-module-card',
    revealed && answerState === 'correct' ? 'insight-module-card--correct' : '',
    revealed && answerState === 'wrong'   ? 'insight-module-card--wrong'   : '',
  ].filter(Boolean).join(' ')

  if (!question || !IMPLEMENTED_TYPES.has(config.moduleType)) {
    return (
      <div className={`${cardClass} insight-module-card--placeholder`}>
        <span className="insight-module-label">{config.label}</span>
        <div className="insight-module-placeholder">Coming soon</div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <span className="insight-module-label">{config.label}</span>
      {config.moduleType === 'numpad' && (
        <NumpadModule
          question={question}
          stage={stage}
          locked={locked}
          revealed={revealed}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}

export default InsightModule
