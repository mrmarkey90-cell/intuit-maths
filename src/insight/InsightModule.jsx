import { useState } from 'react'
import { SUBDOMAIN_CONFIG, DOMAIN_COLORS } from './domainConfig'
import { generateInsightQuestion } from './generators/index'
import NumpadModule from './modules/NumpadModule'
import CircleModule from './modules/CircleModule'
import DragSortModule from './modules/DragSortModule'
import NumberLineModule from './modules/NumberLineModule'
import ShareModule from './modules/ShareModule'
import PairSumModule from './modules/PairSumModule'
import FillBlankModule from './modules/FillBlankModule'

const MODULE_COMPONENTS = {
  numpad: NumpadModule,
  circle: CircleModule,
  drag_sort: DragSortModule,
  number_line: NumberLineModule,
  share: ShareModule,
  pair_sum: PairSumModule,
  fill_blank: FillBlankModule,
}

function InsightModule({ subdomain, level, onAnswer, locked, revealed }) {
  const config = SUBDOMAIN_CONFIG[subdomain] ?? { label: subdomain }
  const [question] = useState(() => generateInsightQuestion(subdomain, level))
  const [answerState, setAnswerState] = useState(null) // null | 'correct' | 'wrong'

  function handleAnswer({ correct }) {
    setAnswerState(correct ? 'correct' : 'wrong')
    onAnswer({ correct, subdomain })
  }

  const cardClass = [
    'insight-module-card',
    revealed && answerState === 'correct' ? 'insight-module-card--correct' : '',
    revealed && answerState === 'wrong'   ? 'insight-module-card--wrong'   : '',
  ].filter(Boolean).join(' ')

  const label = (
    <span className="insight-module-label">
      <span className="insight-domain-dot" style={{ background: DOMAIN_COLORS[config.domain] }} />
      {subdomain} {config.label}
    </span>
  )

  const ModuleComponent = question && MODULE_COMPONENTS[question.moduleType]

  if (!ModuleComponent) {
    return (
      <div className={`${cardClass} insight-module-card--placeholder`}>
        {label}
        <div className="insight-module-placeholder">Coming soon</div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      {label}
      <ModuleComponent
        question={question}
        stage={level}
        locked={locked}
        revealed={revealed}
        onAnswer={handleAnswer}
      />
    </div>
  )
}

export default InsightModule
