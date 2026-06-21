// Pupil identity check: 5 "Would you rather...?" picture-preference
// categories, 9 emoji options each. Not real security -- just personal
// enough that a classmate can't trivially impersonate someone, while
// staying frictionless for non-reading children (tap an emoji, no typing).
//
// No English text lives here -- prompts and option labels are translation
// keys (securityQuestions.<category>.prompt / securityQuestions.<category>.<key>),
// resolved via t() at render time, same convention as insightSubdomain.*.
// Emoji are placeholders until bespoke SVG icons exist (see CLAUDE.md TODO).
export const SECURITY_QUESTION_CATEGORIES = {
  animal: {
    options: [
      { key: 'lion', emoji: '🦁' },
      { key: 'bird', emoji: '🐦' },
      { key: 'dragon', emoji: '🐉' },
      { key: 'cat', emoji: '🐱' },
      { key: 'dog', emoji: '🐶' },
      { key: 'seal', emoji: '🦭' },
      { key: 'sloth', emoji: '🦥' },
      { key: 'owl', emoji: '🦉' },
      { key: 'fox', emoji: '🦊' },
    ],
  },
  colour: {
    options: [
      { key: 'red', emoji: '🔴' },
      { key: 'orange', emoji: '🟠' },
      { key: 'yellow', emoji: '🟡' },
      { key: 'green', emoji: '🟢' },
      { key: 'blue', emoji: '🔵' },
      { key: 'purple', emoji: '🟣' },
      { key: 'brown', emoji: '🟤' },
      { key: 'black', emoji: '⚫' },
      { key: 'white', emoji: '⚪' },
    ],
  },
  subject: {
    options: [
      { key: 'maths', emoji: '🔢' },
      { key: 'reading', emoji: '📖' },
      { key: 'art', emoji: '🎨' },
      { key: 'pe', emoji: '⚽' },
      { key: 'science', emoji: '🔬' },
      { key: 'music', emoji: '🎵' },
      { key: 'computing', emoji: '💻' },
      { key: 'history', emoji: '🏰' },
      { key: 'geography', emoji: '🌍' },
    ],
  },
  superpower: {
    options: [
      { key: 'flying', emoji: '🦸' },
      { key: 'invisibility', emoji: '👻' },
      { key: 'strength', emoji: '💪' },
      { key: 'speed', emoji: '⚡' },
      { key: 'shrinking', emoji: '🤏' },
      { key: 'teleporting', emoji: '✨' },
      { key: 'timeControl', emoji: '⏳' },
      { key: 'mindReading', emoji: '🧠' },
      { key: 'healing', emoji: '💚' },
    ],
  },
  food: {
    options: [
      { key: 'pizza', emoji: '🍕' },
      { key: 'iceCream', emoji: '🍦' },
      { key: 'chocolate', emoji: '🍫' },
      { key: 'fruit', emoji: '🍎' },
      { key: 'pasta', emoji: '🍝' },
      { key: 'burger', emoji: '🍔' },
      { key: 'cake', emoji: '🎂' },
      { key: 'sweets', emoji: '🍬' },
      { key: 'vegetables', emoji: '🥦' },
    ],
  },
}

export const SECURITY_QUESTION_KEYS = Object.keys(SECURITY_QUESTION_CATEGORIES)

export function pickRandomCategories(count) {
  return [...SECURITY_QUESTION_KEYS].sort(() => Math.random() - 0.5).slice(0, count)
}
