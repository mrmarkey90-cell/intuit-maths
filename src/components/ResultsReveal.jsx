import { useState } from 'react'

// Shared "envelope" interstitial shown before any results/scorecard screen
// (Instinct, Insight Practice, and any future activity). Shakes to invite a
// tap, then bursts open -- onOpen fires after the burst animation finishes
// so the caller can swap in its actual scorecard once the envelope is gone.
function ResultsReveal({ label, onOpen }) {
  const [opening, setOpening] = useState(false)

  function handleOpen() {
    if (opening) return
    setOpening(true)
    setTimeout(onOpen, 500)
  }

  return (
    <button
      type="button"
      className={`results-reveal${opening ? ' results-reveal--opening' : ''}`}
      onClick={handleOpen}
      aria-label={label}
    >
      <span className="results-reveal-sparkles" aria-hidden="true">
        <span className="results-reveal-sparkle results-reveal-sparkle--0">✨</span>
        <span className="results-reveal-sparkle results-reveal-sparkle--1">⭐</span>
        <span className="results-reveal-sparkle results-reveal-sparkle--2">⭐</span>
        <span className="results-reveal-sparkle results-reveal-sparkle--3">✨</span>
      </span>
      <span className="results-reveal-envelope" aria-hidden="true">✉️</span>
      <span className="results-reveal-label">{label}</span>
    </button>
  )
}

export default ResultsReveal
