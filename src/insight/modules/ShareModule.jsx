import { useEffect, useState } from 'react'

// Tap +/- to move sweets between the pool and each box — simpler and more
// touch-reliable than literal dragging, same "share equally" goal.
function ShareModule({ question, locked, revealed, onAnswer }) {
  const { totalSweets, boxes, answer } = question
  const [boxCounts, setBoxCounts] = useState(() => Array(boxes).fill(0))

  const placed = boxCounts.reduce((s, c) => s + c, 0)
  const remaining = totalSweets - placed
  const isCorrect = remaining === 0 && boxCounts.every(c => c === answer)

  useEffect(() => {
    onAnswer({ correct: isCorrect })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxCounts])

  function addTo(i) {
    if (locked || remaining <= 0) return
    setBoxCounts(prev => prev.map((c, idx) => (idx === i ? c + 1 : c)))
  }

  function removeFrom(i) {
    if (locked || boxCounts[i] === 0) return
    setBoxCounts(prev => prev.map((c, idx) => (idx === i ? c - 1 : c)))
  }

  return (
    <div className="insight-module-content">
      <div className="insight-share-prompt">
        Share {totalSweets} sweets between {boxes} {boxes === 1 ? 'box' : 'boxes'}
      </div>

      <div className="insight-share-pool">
        {remaining > 0
          ? Array(remaining).fill('🍬').map((s, i) => <span key={i}>{s}</span>)
          : <span className="insight-share-pool-empty">All shared!</span>}
      </div>

      <div className="insight-share-boxes">
        {boxCounts.map((count, i) => {
          const cls = [
            'insight-share-box',
            revealed && count === answer ? 'insight-share-box--correct' : '',
            revealed && count !== answer ? 'insight-share-box--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={i} className={cls}>
              <div className="insight-share-box-sweets">{Array(count).fill('🍬').join(' ')}</div>
              <div className="insight-share-box-controls">
                <button onClick={() => removeFrom(i)} disabled={locked || count === 0}>−</button>
                <span>{count}</span>
                <button onClick={() => addTo(i)} disabled={locked || remaining === 0}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ShareModule
