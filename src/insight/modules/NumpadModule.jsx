import { useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

// A rectangle with a smaller rectangle notched out of its bottom-right
// corner (e.g. "13cm x 8cm, remove a 4cm x 4cm square") -- not to scale,
// every edge labelled. Built from plain data so the generator stays a
// pure function; only this one shape is supported so far.
function RectMinusSquareDiagram({ width, height, cutWidth, cutHeight, unit }) {
  const scale = 14
  const w = width * scale, h = height * scale
  const cw = cutWidth * scale, ch = cutHeight * scale
  const pad = 36
  const ox = pad, oy = pad

  const path = [
    `M ${ox} ${oy}`,
    `L ${ox + w} ${oy}`,
    `L ${ox + w} ${oy + h - ch}`,
    `L ${ox + w - cw} ${oy + h - ch}`,
    `L ${ox + w - cw} ${oy + h}`,
    `L ${ox} ${oy + h}`,
    'Z',
  ].join(' ')

  return (
    <svg className="insight-diagram-svg" viewBox={`0 0 ${ox * 2 + w} ${oy * 2 + h}`}>
      <path d={path} fill="#eef2ff" stroke="#4f46e5" strokeWidth="2.5" />
      <text x={ox + w / 2} y={oy - 10} textAnchor="middle" className="insight-diagram-label">{width}{unit}</text>
      <text x={ox - 10} y={oy + h / 2} textAnchor="middle" className="insight-diagram-label" transform={`rotate(-90, ${ox - 10}, ${oy + h / 2})`}>{height}{unit}</text>
      <text x={ox + w - cw / 2} y={oy + h - ch - 8} textAnchor="middle" className="insight-diagram-label insight-diagram-label--small">{cutWidth}{unit}</text>
      <text x={ox + w - cw + 14} y={oy + h - ch / 2} textAnchor="middle" className="insight-diagram-label insight-diagram-label--small" transform={`rotate(-90, ${ox + w - cw + 14}, ${oy + h - ch / 2})`}>{cutHeight}{unit}</text>
    </svg>
  )
}

function NumpadModule({ question, stage, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const acceptedAnswers = Array.isArray(question.answer) ? question.answer : [question.answer]
  const isCorrect = value !== null && acceptedAnswers.includes(value)
  const overlayTitle = question.column
    ? `${question.column.a} ${question.column.operator} ${question.column.b}`
    : question.question
  const prefix = question.prefix ?? ''

  function handleSubmit(v) {
    setValue(v)
    setShowOverlay(false)
    onAnswer({ correct: acceptedAnswers.includes(v) })
  }

  return (
    <div className="insight-module-content">
      {question.diagram ? (
        <div className="insight-diagram-block">
          <RectMinusSquareDiagram {...question.diagram} />
          <div className="insight-diagram-caption">{question.question}</div>
        </div>
      ) : question.column ? (
        <div className="insight-column-problem">
          <div className="insight-column-inner">
            <div className="insight-column-row">
              <span className="insight-column-operator" />
              <span className="insight-column-number">{question.column.a}</span>
            </div>
            <div className="insight-column-row">
              <span className="insight-column-operator">{question.column.operator}</span>
              <span className="insight-column-number">{question.column.b}</span>
            </div>
            <div className="insight-column-rule" />
          </div>
        </div>
      ) : (
        <div
          className={[
            'insight-module-question',
            question.question?.includes('\n') ? 'insight-module-question--wordproblem' : '',
          ].filter(Boolean).join(' ')}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {question.question}
        </div>
      )}

      {revealed && !isCorrect ? (
        <div className="insight-answer-field insight-answer-field--wrong-revealed">
          {value !== null && <span className="insight-answer-wrong-val">{prefix}{value}</span>}
          <span className="insight-answer-correct-val">✓ {prefix}{acceptedAnswers.join(', ')}</span>
        </div>
      ) : (
        <button
          className={[
            'insight-answer-field',
            value !== null && !revealed ? 'insight-answer-field--filled' : '',
            revealed && isCorrect ? 'insight-answer-field--correct' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => { if (!locked) setShowOverlay(true) }}
          disabled={locked}
        >
          {value === null ? (prefix ? `${prefix}?` : t('insight.tapToAnswer')) : `${prefix}${value}`}
        </button>
      )}

      {showOverlay && (
        <InsightNumpadOverlay
          question={overlayTitle}
          stage={stage}
          initialValue={value ?? ''}
          onSubmit={handleSubmit}
          onDismiss={() => setShowOverlay(false)}
          allowDecimal={!!question.decimal}
        />
      )}
    </div>
  )
}

export default NumpadModule
