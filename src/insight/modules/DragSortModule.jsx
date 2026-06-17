import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Real pointer-based drag (mouse + touch unified via Pointer Events).
// Source row holds unplaced tiles; target row holds N empty slots with a
// "Lowest → Highest" arrow. Dragging between source/target is freely
// reversible until the module is locked.
function DragSortModule({ question, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const [values] = useState(() => shuffle(question.values))
  const [placement, setPlacement] = useState(() => Array(values.length).fill(null))
  const [drag, setDrag] = useState(null) // { value, origin: 'source' | slotIndex, x, y }
  const slotRefs = useRef([])
  const sourceRef = useRef(null)

  const correctOrder = [...question.values].sort((a, b) => a - b)
  const isCorrect = placement.every((v, i) => v === correctOrder[i])
  const sourceItems = values.filter(v => !placement.includes(v))
  const allPlaced = placement.every(v => v !== null)

  useEffect(() => {
    onAnswer({ correct: isCorrect })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement])

  function startDrag(e, value, origin) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ value, origin, x: e.clientX, y: e.clientY })
  }

  function onMove(e) {
    if (!drag) return
    setDrag(d => d && ({ ...d, x: e.clientX, y: e.clientY }))
  }

  function findSlotAt(x, y) {
    for (let i = 0; i < slotRefs.current.length; i++) {
      const el = slotRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
    }
    return null
  }

  function isOverSource(x, y) {
    const el = sourceRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function onUp(e) {
    if (!drag) return
    const targetSlot = findSlotAt(e.clientX, e.clientY)
    const overSource = isOverSource(e.clientX, e.clientY)

    setPlacement(prev => {
      const next = [...prev]
      if (targetSlot !== null) {
        const existing = next[targetSlot]
        if (drag.origin === 'source') {
          next[targetSlot] = drag.value
        } else {
          next[drag.origin] = existing
          next[targetSlot] = drag.value
        }
      } else if (overSource && drag.origin !== 'source') {
        next[drag.origin] = null
      }
      return next
    })
    setDrag(null)
  }

  return (
    <div className="insight-module-content">
      <div className="insight-dragsort-prompt">{question.prompt}</div>

      <div className="insight-dragsort-source" ref={sourceRef}>
        {sourceItems.map(v => (
          <div
            key={v}
            className="insight-dragsort-tile"
            style={{ visibility: drag?.value === v && drag.origin === 'source' ? 'hidden' : 'visible' }}
            onPointerDown={e => startDrag(e, v, 'source')}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            {v}
          </div>
        ))}
      </div>

      <div className="insight-dragsort-arrow-row">
        <span>{t('insight.lowest')}</span>
        <span className="insight-dragsort-arrow">→</span>
        <span>{t('insight.highest')}</span>
      </div>

      <div className="insight-dragsort-target-row">
        {placement.map((v, i) => {
          const cls = [
            'insight-dragsort-slot',
            allPlaced && !revealed ? 'insight-dragsort-slot--filled' : '',
            revealed && isCorrect ? 'insight-dragsort-slot--correct' : '',
            revealed && !isCorrect ? 'insight-dragsort-slot--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={i} ref={el => { slotRefs.current[i] = el }} className={cls}>
              {v !== null && (
                <div
                  className="insight-dragsort-tile"
                  style={{ visibility: drag?.origin === i ? 'hidden' : 'visible' }}
                  onPointerDown={e => startDrag(e, v, i)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                >
                  {v}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {revealed && !isCorrect && (
        <div className="insight-correct-hint">{t('insight.correctOrder')} {correctOrder.join(', ')}</div>
      )}

      {drag && (
        <div className="insight-dragsort-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.value}
        </div>
      )}
    </div>
  )
}

export default DragSortModule
