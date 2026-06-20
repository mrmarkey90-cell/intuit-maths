// Setup Test: a one-time adaptive placement test run right after profile
// creation to give a new pupil a sensible starting Instinct/Insight level
// (the two curricula are treated as roughly analogous, so one test seeds
// both). Separate from domainConfig.js's generateModuleSlots, which solves
// a different problem (picking 12 slots for an already-leveled pupil to
// maximise domain coverage) -- this is a much smaller staircase algorithm
// with its own exclusion list, kept here so it's easy to find and edit.
import { getActiveSubdomains } from './domainConfig'

// Subdomains excluded from the placement test only (not the normal 12-
// question Insight test) because they're easily guessable binary/low-option
// questions -- guessing right or wrong swings the staircase a full level on
// a coin flip, which defeats the point of an adaptive placement test.
// Curated by hand, not derived from module type, since "guessable" depends
// on option count per question instance, not just interaction type.
// Shape: 'all' (every level) or an array of specific levels.
export const PLACEMENT_EXCLUDED_SUBDOMAINS = {
  // '1E': 'all',
  // '7B': [1, 2],
}

function isExcluded(code, level) {
  const rule = PLACEMENT_EXCLUDED_SUBDOMAINS[code]
  if (rule === 'all') return true
  if (Array.isArray(rule)) return rule.includes(level)
  return false
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Falls back to the unfiltered active set if exclusions would empty the
// pool at some level -- the test must never get stuck with zero eligible
// subdomains because of a curation mistake.
export function getPlacementSubdomains(level) {
  const active = getActiveSubdomains(level)
  const eligible = active.filter(code => !isExcluded(code, level))
  return eligible.length > 0 ? eligible : active
}

export function pickPlacementSubdomain(level) {
  return shuffle(getPlacementSubdomains(level))[0] ?? null
}

export const PLACEMENT_QUESTION_COUNT = 10
export const PLACEMENT_TRAILING_WINDOW = 4
export const PLACEMENT_START_LEVEL = 3

export function nextStaircaseLevel(currentLevel, correct) {
  return Math.min(6, Math.max(1, currentLevel + (correct ? 1 : -1)))
}

// levelHistory = the level each question was asked AT (length 10, in
// order) -- final level is round(average of the last 4), clamped 1-6.
export function computeFinalLevel(levelHistory) {
  const trailing = levelHistory.slice(-PLACEMENT_TRAILING_WINDOW)
  const avg = trailing.reduce((sum, l) => sum + l, 0) / trailing.length
  return Math.min(6, Math.max(1, Math.round(avg)))
}
