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
  '3C': 'all',
  '3D': 'all',
  '4B': 'all',
  '4C': 'all',
  '9B': 'all',

  '5A': [5, 6],
  '5B': [5, 6],
  '5D': [5, 6],
  '6C': [5],
  '7A': [6],
  '7B': [6],
  '8A': [4, 5, 6],
  '8C': [6],
  '9A': [5],
  '9C': [6],
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

// Placement deliberately never reaches level 5/6 -- there's no level 7 for
// a pupil to work towards yet, so a too-high placement would be a dead end.
// A too-low placement self-corrects fast via weekly Instinct challenges, so
// the whole test is biased towards dropping rather than climbing.
export const PLACEMENT_MIN_LEVEL = 1
export const PLACEMENT_MAX_LEVEL = 4
export const PLACEMENT_MAX_QUESTIONS = 8

// Q1 is a confidence check, not a maths question -- it just seeds the
// starting level for the real staircase that follows.
export const PLACEMENT_CONFIDENCE_LEVELS = {
  unhappy: 2,
  mild: 3,
  happy: 4,
}

// Per-level tracking for the asymmetric staircase below: a level needs only
// one wrong/IDK to drop if it hasn't seen a correct answer yet, but two
// (not necessarily consecutive) once it has. Moving up still needs two
// correct answers IN A ROW, so any wrong answer resets that streak.
export function initialLevelTrackers() {
  return { hasCorrect: false, wrongCount: 0, correctStreak: 0 }
}

// Returns the next level/trackers after one answer. `ended: true` means the
// pupil hit the floor (another drop from level 1) or ceiling (another rise
// from level 4) -- the test should stop immediately and `level` is final.
export function applyPlacementAnswer(level, trackers, correct) {
  if (correct) {
    const correctStreak = trackers.correctStreak + 1
    if (correctStreak < 2) {
      return { level, trackers: { ...trackers, hasCorrect: true, correctStreak }, ended: false }
    }
    if (level >= PLACEMENT_MAX_LEVEL) {
      return { level, trackers: initialLevelTrackers(), ended: true }
    }
    return { level: level + 1, trackers: initialLevelTrackers(), ended: false }
  }

  const wrongCount = trackers.wrongCount + 1
  const dropThreshold = trackers.hasCorrect ? 2 : 1
  if (wrongCount < dropThreshold) {
    return { level, trackers: { ...trackers, wrongCount, correctStreak: 0 }, ended: false }
  }
  if (level <= PLACEMENT_MIN_LEVEL) {
    return { level, trackers: initialLevelTrackers(), ended: true }
  }
  return { level: level - 1, trackers: initialLevelTrackers(), ended: false }
}
