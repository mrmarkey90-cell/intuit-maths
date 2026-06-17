import { useRef, useState } from 'react'

// A true ruled number line with a draggable arrow (Pointer Events, same
// approach as DragSortModule's tiles). Tap anywhere on the line to jump
// the arrow there and start dragging, or grab the arrow itself — it
// snaps to the nearest notch the whole time, so it's always resting on
// an exact integer. Only the two end values are labelled until marking
// is revealed, when every notch gets a label and (if wrong) a second
// marker shows where the correct answer was.
function NumberLineModule({ question, locked, revealed, onAnswer }) {
  const { min, max, answer } = question
  const [value, setValue] = useState(min)
  const [dragValue, setDragValue] = useState(null)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)

  const ticks = []
  for (let v = min; v <= max; v++) ticks.push(v)

  function pctForValue(v) {
    return ((v - min) / (max - min)) * 100
  }

  function valueForClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(min + pct * (max - min))
  }

  function handleDown(e) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    setDragValue(valueForClientX(e.clientX))
  }

  function handleMove(e) {
    if (!dragging) return
    setDragValue(valueForClientX(e.clientX))
  }

  function handleUp(e) {
    if (!dragging) return
    const v = valueForClientX(e.clientX)
    setDragging(false)
    setValue(v)
    onAnswer({ correct: v === answer })
  }

  const displayValue = dragging ? dragValue : value
  const isCorrect = displayValue === answer

  return (
    <div className="insight-module-content">
      <div className="insight-numberline-prompt">{question.prompt}</div>
      <div
        className="insight-numberline-rule"
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={displayValue ?? min}
      >
        <div className="insight-numberline-line" />

        {ticks.map(v => {
          const isEnd = v === min || v === max
          const showLabel = isEnd || revealed
          return (
            <div key={v} className="insight-numberline-notch" style={{ left: `${pctForValue(v)}%` }}>
              <span className="insight-numberline-mark" />
              {showLabel && <span className="insight-numberline-label">{v}</span>}
            </div>
          )
        })}

        {revealed && !isCorrect && (
          <div className="insight-numberline-target" style={{ left: `${pctForValue(answer)}%` }}>
            <span className="insight-numberline-handle-arrow">▲</span>
          </div>
        )}

        {displayValue !== null && (
          <div
            className={[
              'insight-numberline-handle',
              !dragging && revealed && isCorrect ? 'insight-numberline-handle--correct' : '',
              !dragging && revealed && !isCorrect ? 'insight-numberline-handle--wrong' : '',
            ].filter(Boolean).join(' ')}
            style={{ left: `${pctForValue(displayValue)}%`, transition: dragging ? 'none' : 'left 0.12s ease-out' }}
          >
            <span className="insight-numberline-handle-arrow">▼</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default NumberLineModule
