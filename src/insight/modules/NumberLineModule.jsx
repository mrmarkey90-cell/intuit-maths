import { useRef, useState } from 'react'

function decimalPlaces(step) {
  const s = String(step)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

// A true ruled number line with a draggable arrow (Pointer Events, same
// approach as DragSortModule's tiles). Tap anywhere on the line to jump
// the arrow there and start dragging, or grab the arrow itself — it
// snaps to the nearest notch the whole time, so it's always resting on
// an exact value. Only the two end values are labelled until marking
// is revealed, when every notch gets a label and (if wrong) a second
// marker shows where the correct answer was.
//
// `step` defaults to 1 (whole-number notches) but a question can supply
// a decimal step (e.g. 0.1) for fractional number lines -- all rounding
// goes through `snap()` so both the drag value and the stored answer
// are normalised the same way, avoiding floating-point equality bugs.
function NumberLineModule({ question, locked, revealed, onAnswer }) {
  const { min, max, answer, labelPoints = [min, max], step = 1 } = question
  const decimals = decimalPlaces(step)
  const factor = 10 ** decimals

  function snap(v) {
    return Math.round(v * factor) / factor
  }

  const [value, setValue] = useState(min)
  const [dragValue, setDragValue] = useState(null)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)

  const tickCount = Math.round((max - min) / step)
  const ticks = []
  for (let i = 0; i <= tickCount; i++) ticks.push(snap(min + i * step))

  function pctForValue(v) {
    return ((v - min) / (max - min)) * 100
  }

  function valueForClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = min + pct * (max - min)
    return snap(Math.round((raw - min) / step) * step + min)
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
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <div className="insight-numberline-line" />

        {ticks.map(v => {
          const showLabel = labelPoints.includes(v) || revealed
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
              dragging ? 'insight-numberline-handle--dragging' : '',
              !dragging && revealed && isCorrect ? 'insight-numberline-handle--correct' : '',
              !dragging && revealed && !isCorrect ? 'insight-numberline-handle--wrong' : '',
            ].filter(Boolean).join(' ')}
            style={{ left: `${pctForValue(displayValue)}%`, transition: dragging ? 'none' : 'left 0.12s ease-out' }}
          >
            <span className="insight-numberline-handle-knob" />
            <span className="insight-numberline-handle-arrow">▼</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default NumberLineModule
