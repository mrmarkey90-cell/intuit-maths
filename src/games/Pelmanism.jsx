import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import AvatarDisplay from '../components/AvatarDisplay'
import TimerBar from '../components/TimerBar'
import { DEFAULT_AVATAR } from '../lib/avatarConfig'
import { generateQuestion } from '../lib/questionGenerator'

const TIMER_SECONDS = 60

// First-draft pairs/credits per level -- expect retuning. The credit
// numbers here are display-only; submit_pelmanism_result's SQL CASE is the
// authoritative source and must be kept in sync by hand when these change.
const LEVELS = [
  { level: 1, pairs: 4, credits: 2 },
  { level: 2, pairs: 5, credits: 4 },
  { level: 3, pairs: 6, credits: 8 },
  { level: 4, pairs: 8, credits: 20 },
]

// Time-taken-to-completion penalty tiers. Display-only here; the
// submit_pelmanism_result SQL CASE applies the authoritative version and
// must be kept in sync by hand if these are retuned.
const TIME_PENALTY_TIERS = [
  { maxSeconds: 20, pct: 0 },
  { maxSeconds: 40, pct: 0.25 },
  { maxSeconds: 60, pct: 0.50 },
]

function getPenaltyPct(seconds) {
  const tier = TIME_PENALTY_TIERS.find(t => seconds <= t.maxSeconds)
  return tier ? tier.pct : TIME_PENALTY_TIERS[TIME_PENALTY_TIERS.length - 1].pct
}

function formatRaw(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Cards carry a `value` (the answer's string form) rather than a fixed
// pairId -- matching is judged by value equality between a question card
// and an answer card, so any answer card with the right value completes a
// question card, not only the one it happened to be generated alongside.
// (If two questions in the same deck share an answer by coincidence, that
// just means either answer card can complete either question card --
// still exactly enough cards for every pair to be found.)
function buildDeck(pairs, instinctLevel, language) {
  const cards = []
  for (let i = 0; i < pairs; i++) {
    const { question, answer } = generateQuestion(instinctLevel, language)
    const value = String(answer)
    cards.push({ kind: 'question', text: question, value })
    cards.push({ kind: 'answer', text: value, value })
  }
  return shuffle(cards)
}

// Real pupil-facing game behind the Hub's Games tile. Unlimited frequency,
// credits-only reward (same philosophy as Instinct/Insight Practice) -- a
// timeout writes nothing, a win calls submit_pelmanism_result once.
function Pelmanism({ pupilId, instinctLevel, avatar, onComplete }) {
  const { t, language } = useTranslation()

  const [view, setView] = useState('select') // select | playing | results
  const [levelConfig, setLevelConfig] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([]) // indices of face-up, unmatched cards
  const [matchedIndices, setMatchedIndices] = useState(new Set())
  const [locked, setLocked] = useState(false) // true while a mismatched pair is briefly shown
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [outcome, setOutcome] = useState(null) // 'won' | 'timeout'
  const [creditsEarned, setCreditsEarned] = useState(0)
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0)
  const [penaltyPct, setPenaltyPct] = useState(0)

  const startRef = useRef(null)
  const submittedRef = useRef(false) // guards against double-submitting credits for one win

  useEffect(() => {
    if (view !== 'playing') return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const remaining = Math.max(0, TIMER_SECONDS - elapsed)
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(interval)
        finish('timeout')
      }
    }, 250)
    return () => clearInterval(interval)
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  function startLevel(config) {
    setLevelConfig(config)
    setCards(buildDeck(config.pairs, instinctLevel, language))
    setFlipped([])
    setMatchedIndices(new Set())
    setLocked(false)
    setTimeLeft(TIMER_SECONDS)
    setOutcome(null)
    submittedRef.current = false
    setCreditsEarned(0)
    setTimeTakenSeconds(0)
    setPenaltyPct(0)
    startRef.current = Date.now()
    setView('playing')
  }

  async function finish(result) {
    setOutcome(result)

    if (result === 'won') {
      // Ceiling-rounded so a partial-second penalty never costs a pupil a
      // whole coin it would otherwise round down to losing.
      const elapsed = Math.ceil((Date.now() - startRef.current) / 1000)
      const pct = getPenaltyPct(elapsed)
      const expected = Math.ceil(levelConfig.credits * (1 - pct))
      setTimeTakenSeconds(elapsed)
      setPenaltyPct(pct)
      setCreditsEarned(expected)
      setView('results')

      if (!submittedRef.current) {
        submittedRef.current = true
        const { data } = await supabase.rpc('submit_pelmanism_result', {
          p_pupil_id: pupilId,
          p_level: levelConfig.level,
          p_time_taken_seconds: elapsed,
        })
        setCreditsEarned(data?.credits_earned ?? expected)
      }
    } else {
      setView('results')
    }
  }

  function flipCard(index) {
    if (locked) return
    if (flipped.length === 2) return
    if (flipped.includes(index)) return
    if (matchedIndices.has(index)) return

    const next = [...flipped, index]
    setFlipped(next)
    if (next.length < 2) return

    const [i1, i2] = next
    const c1 = cards[i1]
    const c2 = cards[i2]
    if (c1.kind !== c2.kind && c1.value === c2.value) {
      const newMatched = new Set(matchedIndices)
      newMatched.add(i1)
      newMatched.add(i2)
      setMatchedIndices(newMatched)
      setFlipped([])
      if (newMatched.size === cards.length) finish('won')
    } else {
      setLocked(true)
      setTimeout(() => {
        setFlipped([])
        setLocked(false)
      }, 700)
    }
  }

  function handleRetry() {
    setView('select')
  }

  if (view === 'select') return (
    <div className="screen pelmanism-screen">
      <h1>{t('pelmanism.selectTitle')}</h1>
      <div className="pelmanism-level-grid">
        {LEVELS.map(cfg => (
          <button key={cfg.level} className="pelmanism-level-btn" onClick={() => startLevel(cfg)}>
            <span className="pelmanism-level-number">{t('pelmanism.level').replace('{n}', cfg.level)}</span>
            <span className="pelmanism-level-detail">{t('pelmanism.pairsCount').replace('{n}', cfg.pairs)}</span>
            <span className="pelmanism-level-credits">🪙 +{cfg.credits}</span>
          </button>
        ))}
      </div>
      <button className="button-secondary" onClick={onComplete}>{t('pupilSession.myHub')}</button>
    </div>
  )

  if (view === 'playing') return (
    <div className="pelmanism-playing-screen">
      <TimerBar timeLeft={timeLeft} duration={TIMER_SECONDS} />
      <div className="pelmanism-playing-body">
        <button type="button" className="pelmanism-hub-btn" onClick={onComplete}>
          {t('pupilSession.myHub')}
        </button>
        <div className="pelmanism-grid" style={{ gridTemplateColumns: `repeat(${levelConfig.pairs}, 1fr)` }}>
          {cards.map((card, i) => {
            const isMatched = matchedIndices.has(i)
            const isFaceUp = isMatched || flipped.includes(i)
            return (
              <button
                key={i}
                type="button"
                className={`pelmanism-card${isFaceUp ? ' pelmanism-card--flipped' : ''}${isMatched ? ' pelmanism-card--matched' : ''}`}
                onClick={() => flipCard(i)}
                disabled={isMatched}
                aria-label={isFaceUp ? card.text : t('pelmanism.faceDown')}
              >
                <span className="pelmanism-card-inner">
                  <span className="pelmanism-card-face pelmanism-card-face--back">
                    <img src="/games/pelmanism/card-back.svg" alt="" />
                  </span>
                  <span className="pelmanism-card-face pelmanism-card-face--front">
                    <img src="/games/pelmanism/card-front.svg" alt="" />
                    <span className="pelmanism-card-text">{card.text}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen pelmanism-screen">
      <div className="results-celebration-header">
        <AvatarDisplay avatar={avatar ?? DEFAULT_AVATAR} size={72} state={outcome === 'won' ? 'celebrate' : 'idle'} />
        <h1 className="results-celebration-title">
          {outcome === 'won' ? t('pelmanism.wonTitle') : t('pelmanism.timeoutTitle')}
        </h1>
      </div>
      <div className="results-summary">
        <div className="stat-box stat-box--large stat-box--score">
          <div className="stat-number">🧩 {matchedIndices.size / 2}/{levelConfig.pairs}</div>
          <div className="stat-label">{t('pelmanism.pairsFoundLabel')}</div>
        </div>
        <div className="stat-box stat-box--large stat-box--coins">
          <div className="stat-number">🪙 +{creditsEarned}</div>
          <div className="stat-label">{t('pupilHub.credits')}</div>
        </div>
      </div>
      {outcome === 'won' && (
        <div className="pelmanism-penalty-detail">
          <p>{t('pelmanism.timeTaken').replace('{n}', timeTakenSeconds)}</p>
          <p>
            {t('pelmanism.penaltyCalc')
              .replace('{base}', levelConfig.credits)
              .replace('{pct}', Math.round(penaltyPct * 100))
              .replace('{raw}', formatRaw(levelConfig.credits * (1 - penaltyPct)))
              .replace('{final}', creditsEarned)}
          </p>
        </div>
      )}
      <div className="results-action-btns">
        <button className="results-action-btn results-action-btn--secondary" onClick={handleRetry}>
          {t('pelmanism.retry')}
        </button>
        <button className="results-action-btn results-action-btn--primary" onClick={onComplete}>
          {t('pupilSession.myHub')}
        </button>
      </div>
    </div>
  )
}

export default Pelmanism
