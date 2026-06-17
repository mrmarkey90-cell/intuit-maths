import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// A pattern sequence with a single gap. The plausible answers sit in a
// row below as draggable tiles (same pointer-based drag as DragSortModule)
// — drag one onto the gap to fill it, or drag the filled tile back down
// to the row to clear it. Only one slot, so no slot-index bookkeeping.
function FillBlankModule({ question, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const { sequence, options, answer } = question
  const [order] = useState(() => shuffle(options))
  const [placed, setPlaced] = useState(null)
  const [drag, setDrag] = useState(null) // { value, x, y }
  const slotRef = useRef(null)
  const rowRef = useRef(null)

  const isCorrect = placed === answer
  const poolItems = order.filter(v => v !== placed)

  useEffect(() => {
    if (placed !== null) onAnswer({ correct: isCorrect })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  function startDrag(e, value) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ value, x: e.clientX, y: e.clientY })
  }

  function onMove(e) {
    if (!drag) return
    setDrag(d => d && ({ ...d, x: e.clientX, y: e.clientY }))
  }

  function isWithin(ref, x, y) {
    const el = ref.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function onUp(e) {
    if (!drag) return
    if (isWithin(slotRef, e.clientX, e.clientY)) {
      setPlaced(drag.value)
    } else if (isWithin(rowRef, e.clientX, e.clientY) && drag.value === placed) {
      setPlaced(null)
    }
    setDrag(null)
  }

  const slotClass = [
    'insight-dragsort-slot',
    'insight-fillblank-slot',
    placed !== null && !revealed ? 'insight-dragsort-slot--filled' : '',
    revealed && isCorrect ? 'insight-dragsort-slot--correct' : '',
    revealed && !isCorrect ? 'insight-dragsort-slot--wrong' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="insight-module-content">
      <div className="insight-fillblank-sequence">
        {sequence.map((v, i) => {
          const isLast = i === sequence.length - 1
          if (v === null) {
            return (
              <div key={i} className="insight-fillblank-item">
                <div ref={slotRef} className={slotClass}>
                  {placed !== null && (
                    <div
                      className="insight-dragsort-tile"
                      style={{ visibility: drag?.value === placed ? 'hidden' : 'visible' }}
                      onPointerDown={e => startDrag(e, placed)}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                    >
                      {placed}
                    </div>
                  )}
                </div>
                {!isLast && <span className="insight-fillblank-comma">,</span>}
              </div>
            )
          }
          return (
            <div key={i} className="insight-fillblank-item">
              <span className="insight-fillblank-value">{v}{!isLast ? ',' : ''}</span>
            </div>
          )
        })}
      </div>

      {revealed && !isCorrect && (
        <div className="insight-correct-hint">{t('insight.correctAnswer')} {answer}</div>
      )}

      <div className="insight-fillblank-options" ref={rowRef}>
        {poolItems.map(v => (
          <div
            key={v}
            className="insight-dragsort-tile"
            onPointerDown={e => startDrag(e, v)}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            {v}
          </div>
        ))}
      </div>

      {drag && (
        <div className="insight-dragsort-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.value}
        </div>
      )}
    </div>
  )
}

export default FillBlankModule
