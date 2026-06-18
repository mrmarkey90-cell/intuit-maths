import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

// Two columns -- drag from a left item to a right item to connect them
// (Pointer Events, same approach as DragSortModule/PartitionModule).
// Dragging a left item again redraws its connection elsewhere; dropping
// on a right item that's already taken steals it from whichever left
// item had it. Only counts as answered once every left item is
// connected to something.
function MatchModule({ question, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
  const { left, right, correctIndices } = question
  const [connections, setConnections] = useState(() => left.map(() => null))
  const [drag, setDrag] = useState(null) // { leftIndex, x, y }
  const [lines, setLines] = useState([])

  const wrapRef = useRef(null)
  const leftRefs = useRef([])
  const rightRefs = useRef([])

  function anchorFor(el, wrapRect, side) {
    const r = el.getBoundingClientRect()
    return {
      x: (side === 'left' ? r.right : r.left) - wrapRect.left,
      y: r.top + r.height / 2 - wrapRect.top,
    }
  }

  function recalcLines() {
    const wrap = wrapRef.current
    if (!wrap) return
    const wrapRect = wrap.getBoundingClientRect()
    setLines(connections.map((rightIndex, leftIndex) => {
      if (rightIndex === null) return null
      const l = leftRefs.current[leftIndex]
      const r = rightRefs.current[rightIndex]
      if (!l || !r) return null
      const a = anchorFor(l, wrapRect, 'left')
      const b = anchorFor(r, wrapRect, 'right')
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
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
  }, [connections, revealed])

  function startDrag(e, leftIndex) {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ leftIndex, x: e.clientX, y: e.clientY })
  }

  function onMove(e) {
    if (!drag) return
    setDrag(d => d && ({ ...d, x: e.clientX, y: e.clientY }))
  }

  function rightIndexAt(x, y) {
    for (let i = 0; i < rightRefs.current.length; i++) {
      const el = rightRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
    }
    return null
  }

  function onUp(e) {
    if (!drag) return
    const targetRight = rightIndexAt(e.clientX, e.clientY)
    if (targetRight !== null) {
      setConnections(prev => {
        const next = prev.map(v => (v === targetRight ? null : v))
        next[drag.leftIndex] = targetRight
        if (next.every(v => v !== null)) {
          onAnswer({ correct: next.every((v, i) => v === correctIndices[i]) })
        }
        return next
      })
    }
    setDrag(null)
  }

  const dragLine = (() => {
    if (!drag || !wrapRef.current) return null
    const l = leftRefs.current[drag.leftIndex]
    if (!l) return null
    const wrapRect = wrapRef.current.getBoundingClientRect()
    const a = anchorFor(l, wrapRect, 'left')
    return { x1: a.x, y1: a.y, x2: drag.x - wrapRect.left, y2: drag.y - wrapRect.top }
  })()

  return (
    <div className="insight-module-content">
      <div className="insight-match-wrap" ref={wrapRef}>
        <svg className="insight-match-svg">
          {lines.map((l, i) => l && (
            <line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={revealed ? (connections[i] === correctIndices[i] ? '#16a34a' : '#dc2626') : '#4f46e5'}
              strokeWidth="3"
            />
          ))}
          {dragLine && (
            <line
              x1={dragLine.x1} y1={dragLine.y1} x2={dragLine.x2} y2={dragLine.y2}
              stroke="#9ca3af" strokeWidth="3" strokeDasharray="6 5"
            />
          )}
        </svg>

        <div className="insight-match-column">
          {left.map((val, i) => (
            <button
              key={i}
              ref={el => { leftRefs.current[i] = el }}
              className={[
                'insight-match-item',
                connections[i] !== null && !revealed ? 'insight-match-item--connected' : '',
                drag?.leftIndex === i ? 'insight-match-item--dragging' : '',
                revealed && connections[i] === correctIndices[i] ? 'insight-match-item--correct' : '',
                revealed && connections[i] !== correctIndices[i] ? 'insight-match-item--wrong' : '',
              ].filter(Boolean).join(' ')}
              onPointerDown={e => startDrag(e, i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              disabled={locked}
            >
              {val}
            </button>
          ))}
        </div>

        <div className="insight-match-column">
          {right.map((val, i) => {
            const connectedFrom = connections.indexOf(i)
            const isConnected = connectedFrom !== -1
            const isRight = isConnected && connections[connectedFrom] === correctIndices[connectedFrom]
            return (
              <div
                key={i}
                ref={el => { rightRefs.current[i] = el }}
                className={[
                  'insight-match-item',
                  isConnected && !revealed ? 'insight-match-item--connected' : '',
                  revealed && isConnected && isRight ? 'insight-match-item--correct' : '',
                  revealed && isConnected && !isRight ? 'insight-match-item--wrong' : '',
                ].filter(Boolean).join(' ')}
              >
                {val}
              </div>
            )
          })}
        </div>
      </div>

      {revealed && !connections.every((v, i) => v === correctIndices[i]) && (
        <div className="insight-correct-hint">
          {t('insight.correct')} {left.map((l, i) => `${l}=${right[correctIndices[i]]}`).join(', ')}
        </div>
      )}
    </div>
  )
}

export default MatchModule
