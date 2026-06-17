import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import InsightNumpadOverlay from '../InsightNumpadOverlay'

// Shows the number itself with real angled arrows (SVG, measured against
// each digit and box's actual position) pointing from every digit down to
// its own numpad box — no words, so it reads the same in any language.
// Generalises to any number of parts: each *digit* character (skipping
// punctuation like the decimal point, e.g. 3.6 -> ['3','.','6']) maps
// 1:1 to a part left-to-right (3.6 -> [3, 0.6]). Every box is always
// required at every level — there's no hidden slot.
function PartitionModule({ question, stage, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const { number, parts } = question
  const [values, setValues] = useState(() => parts.map(() => null))
  const [activeBox, setActiveBox] = useState(null)
  const [lines, setLines] = useState([])

  const wrapRef = useRef(null)
  const digitRefs = useRef([])
  const boxRefs = useRef([])
  const chars = String(number).split('')
  let digitCounter = 0
  const charDigitIndex = chars.map(c => (/[0-9]/.test(c) ? digitCounter++ : null))

  // Targets sit a fixed distance below each digit and above each box,
  // rather than right on their edges — gives the arrow a clear start/end
  // point of its own instead of touching (and on small screens, slightly
  // overlapping) the digit or the box.
  const TARGET_GAP = 14

  function recalcLines() {
    const wrap = wrapRef.current
    if (!wrap) return
    const wrapRect = wrap.getBoundingClientRect()
    setLines(parts.map((_, i) => {
      const d = digitRefs.current[i]
      const b = boxRefs.current[i]
      if (!d || !b) return null
      const dr = d.getBoundingClientRect()
      const br = b.getBoundingClientRect()
      return {
        x1: dr.left + dr.width / 2 - wrapRect.left,
        y1: dr.bottom - wrapRect.top + TARGET_GAP,
        x2: br.left + br.width / 2 - wrapRect.left,
        y2: br.top - wrapRect.top - TARGET_GAP,
      }
    }))
  }

  useLayoutEffect(() => {
    recalcLines()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(recalcLines)
    ro.observe(wrap)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, revealed])

  function handleSubmit(v) {
    const next = [...values]
    next[activeBox] = Number(v)
    setValues(next)
    setActiveBox(null)
    if (next.every(x => x !== null)) {
      onAnswer({ correct: next.every((x, i) => x === parts[i]) })
    }
  }

  const overlayQuestion = activeBox === null
    ? ''
    : parts.map((p, i) => (i === activeBox ? '?' : (values[i] ?? '?'))).join(' + ')

  return (
    <div className="insight-module-content">
      <div className="insight-partition-wrap" ref={wrapRef}>
        <div className="insight-partition-number">
          {chars.map((c, i) => {
            const idx = charDigitIndex[i]
            return (
              <span
                key={i}
                ref={idx === null ? null : el => { digitRefs.current[idx] = el }}
                className="insight-partition-digit"
              >
                {c}
              </span>
            )
          })}
        </div>

        <svg className="insight-partition-arrows-svg">
          <defs>
            <marker id="insight-partition-arrowhead" markerWidth="8" markerHeight="8" refX="3.5" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#9ca3af" />
            </marker>
          </defs>
          {lines.map((l, i) => l && (
            <g key={i}>
              <circle cx={l.x1} cy={l.y1} r="4" fill="#9ca3af" />
              <circle cx={l.x2} cy={l.y2} r="4" fill="#9ca3af" />
              <line
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#9ca3af" strokeWidth="2.5"
                markerEnd="url(#insight-partition-arrowhead)"
              />
            </g>
          ))}
        </svg>

        <div className={`insight-partition-row${parts.length >= 4 ? ' insight-partition-row--compact' : ''}`}>
          {parts.map((p, i) => {
            const filled = values[i] !== null
            const cls = [
              'insight-partition-box',
              filled && !revealed ? 'insight-partition-box--filled' : '',
              revealed && values[i] === p ? 'insight-partition-box--correct' : '',
              revealed && values[i] !== p ? 'insight-partition-box--wrong' : '',
            ].filter(Boolean).join(' ')
            return (
              <Fragment key={i}>
                {i > 0 && <span className="insight-partition-plus">+</span>}
                <button
                  ref={el => { boxRefs.current[i] = el }}
                  className={cls}
                  onClick={() => { if (!locked) setActiveBox(i) }}
                  disabled={locked}
                >
                  {values[i] ?? ''}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {revealed && !parts.every((p, i) => values[i] === p) && (
        <div className="insight-correct-hint">{t('insight.correct')} {parts.join(' + ')}</div>
      )}

      {activeBox !== null && (
        <InsightNumpadOverlay
          question={overlayQuestion}
          stage={stage}
          initialValue={values[activeBox] != null ? String(values[activeBox]) : ''}
          onSubmit={handleSubmit}
          onDismiss={() => setActiveBox(null)}
          allowDecimal={!!question.decimal}
        />
      )}
    </div>
  )
}

export default PartitionModule
