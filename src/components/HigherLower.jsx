import { useState, useMemo } from 'react'
import { useTranslation } from '../i18n/LanguageContext'

const TOTAL = 7  // 8 cards, 7 guesses

function genCards() {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 8)
}

function CardFace({ value }) {
  // TODO: swap to <img src={`/cards/${value}.svg`} alt={value} className="hl-card-img" /> when assets arrive
  return (
    <div className="hl-card-face">
      <span className="hl-card-num">{value}</span>
      <span className="hl-card-suit">♦</span>
    </div>
  )
}

export default function HigherLower({ onComplete }) {
  const { t } = useTranslation()
  const cards = useMemo(genCards, [])
  const [pos, setPos] = useState(0)      // index of current face-up card
  const [fb, setFb] = useState(null)     // { ok, higher } during reveal
  const [score, setScore] = useState(0)
  const [results, setResults] = useState([])  // bool per guess, for end-screen colouring
  const done = pos >= TOTAL

  function guess(higher) {
    if (fb || done) return
    const ok = higher ? cards[pos + 1] > cards[pos] : cards[pos + 1] < cards[pos]
    const nextScore = ok ? score + 1 : score
    const nextPos = pos + 1
    setFb({ ok, higher })
    setTimeout(() => {
      setScore(nextScore)
      setPos(nextPos)
      setResults(r => [...r, ok])
      setFb(null)
    }, 900)
  }

  const cardRow = (
    <div className="hl-cards">
      {cards.map((val, i) => {
        const revealed = i <= pos || (fb != null && i === pos + 1)
        const fbClass = fb != null && i === pos + 1
          ? (fb.ok ? ' hl-card--correct' : ' hl-card--wrong') : ''
        return (
          <div
            key={i}
            className={`hl-card${revealed ? ' hl-card--revealed' : ''}${i === pos && !done ? ' hl-card--current' : ''}${fbClass}`}
          >
            {revealed && <CardFace key={`${i}-face`} value={val} />}
          </div>
        )
      })}
    </div>
  )

  if (done) {
    const doneCardRow = (
      <div className="hl-cards">
        {cards.map((val, i) => {
          const resultClass = i === 0 ? '' : results[i - 1] ? ' hl-card--correct' : ' hl-card--wrong'
          return (
            <div key={i} className={`hl-card hl-card--revealed${resultClass}`}>
              <CardFace value={val} />
            </div>
          )
        })}
      </div>
    )
    return (
      <div className="higher-lower">
        {doneCardRow}
        <div className="hl-result">
          <div className="hl-score">{score}<span>/{TOTAL}</span></div>
          <button className="mission-next-btn" onClick={() => onComplete({ score, total: TOTAL })}>
            {t('mission.next')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="higher-lower">
      {cardRow}
      <div className="hl-prompt">
        <div className="hl-prompt-label">{t('higherLower.prompt')}</div>
        <div className="hl-buttons">
          <button
            className={`hl-btn${fb != null && fb.higher && fb.ok ? ' hl-btn--correct' : ''}${fb != null && fb.higher && !fb.ok ? ' hl-btn--wrong' : ''}`}
            onClick={() => guess(true)}
            disabled={!!fb}
          >{t('higherLower.higher')} ↑</button>
          <button
            className={`hl-btn${fb != null && !fb.higher && fb.ok ? ' hl-btn--correct' : ''}${fb != null && !fb.higher && !fb.ok ? ' hl-btn--wrong' : ''}`}
            onClick={() => guess(false)}
            disabled={!!fb}
          >{t('higherLower.lower')} ↓</button>
        </div>
      </div>
    </div>
  )
}
