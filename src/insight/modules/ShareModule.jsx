import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

// Renders individual sweets for small counts (useful for counting by eye),
// but falls back to a compact "x N" badge above that — guarantees the pool
// and boxes never need to wrap/scroll regardless of how big a future
// level's numbers get.
const COMPACT_THRESHOLD = 8

function SweetCount({ count }) {
  if (count === 0) return null
  if (count <= COMPACT_THRESHOLD) {
    return Array(count).fill('🍬').map((s, i) => <span key={i}>{s}</span>)
  }
  return <span className="insight-share-compact">🍬 ×{count}</span>
}

// Tap +/- to move sweets between the pool and each box — simpler and more
// touch-reliable than literal dragging, same "share equally" goal.
function ShareModule({ question, locked, revealed, onAnswer }) {
  const { t } = useTranslation()
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
        {t('insight.sharePrompt')
          .replace('{n}', totalSweets)
          .replace('{m}', boxes)
          .replace('{box}', t(boxes === 1 ? 'insight.shareBoxSingular' : 'insight.shareBoxPlural'))}
      </div>

      <div className="insight-share-pool">
        {remaining > 0
          ? <SweetCount count={remaining} />
          : <span className="insight-share-pool-empty">{t('insight.allShared')}</span>}
      </div>

      <div className="insight-share-boxes">
        {boxCounts.map((count, i) => {
          const cls = [
            'insight-share-box',
            remaining === 0 && !revealed ? 'insight-share-box--filled' : '',
            revealed && count === answer ? 'insight-share-box--correct' : '',
            revealed && count !== answer ? 'insight-share-box--wrong' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={i} className={cls}>
              <div className="insight-share-box-sweets"><SweetCount count={count} /></div>
              <div className="insight-share-box-controls">
                <button
                  className="insight-share-btn insight-share-btn--remove"
                  onClick={() => removeFrom(i)}
                  disabled={locked || count === 0}
                  aria-label="Take a sweet out"
                >
                  −
                </button>
                <span className="insight-share-box-count">{count}</span>
                <button
                  className="insight-share-btn insight-share-btn--add"
                  onClick={() => addTo(i)}
                  disabled={locked || remaining === 0}
                  aria-label="Add a sweet"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {revealed && !isCorrect && (
        <div className="insight-correct-hint">{t('insight.correctSweetsInEachBox').replace('{n}', answer)}</div>
      )}
    </div>
  )
}

export default ShareModule
