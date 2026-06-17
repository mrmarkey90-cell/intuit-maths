import { w, randomItemIndex } from './words'

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 1A — Counting: "What comes after 498?"
export function L3_1A(lang) {
  const n = rand(350, 950)
  return {
    moduleType: 'numpad',
    question: w(lang).whatComesAfter(n),
    answer: String(n + 1),
  }
}

// 1B — Partitioning: 3-digit number splits into hundreds + tens + units,
// all three boxes always required (see PartitionModule)
export function L3_1B() {
  const h = rand(1, 9)
  const t = rand(0, 9)
  const u = rand(0, 9)
  return {
    moduleType: 'partition',
    number: h * 100 + t * 10 + u,
    parts: [h * 100, t * 10, u],
  }
}

// 1E — Even / Odd: "Find the even numbers" from 5 random 1-30 values
export function L3_1E(lang) {
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 5) pool.add(rand(1, 30))
    values = [...pool]
    correctIndices = values.map((v, i) => (v % 2 === 0 ? i : -1)).filter(i => i !== -1)
  } while (correctIndices.length === 0 || correctIndices.length === values.length)
  return {
    moduleType: 'multi_select',
    prompt: w(lang).findEvenNumbers,
    options: values,
    correctIndices,
  }
}

// 1F — Multiples: "Which are in the 2 times table?" from 5 random 1-20 values
export function L3_1F(lang) {
  const table = 2
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 5) pool.add(rand(1, 20))
    values = [...pool]
    correctIndices = values.map((v, i) => (v % table === 0 ? i : -1)).filter(i => i !== -1)
  } while (correctIndices.length === 0 || correctIndices.length === values.length)
  return {
    moduleType: 'multi_select',
    prompt: w(lang).whichAreInTimesTable(table),
    options: values,
    correctIndices,
  }
}

// 2A — Sequencing: drag smallest to largest, range 25-200
export function L3_2A(lang) {
  const vals = new Set()
  while (vals.size < 4) vals.add(rand(25, 200))
  return {
    moduleType: 'drag_sort',
    prompt: w(lang).dragSmallestToLargest,
    values: [...vals],
  }
}

// 2B — Comparing: "Which is bigger?" with 3-digit numbers
export function L3_2B(lang) {
  let a = rand(100, 999)
  let b = rand(100, 999)
  while (a === b) b = rand(100, 999)
  return {
    moduleType: 'circle',
    prompt: w(lang).whichIsBigger,
    options: [String(a), String(b)],
    correctIndex: a > b ? 0 : 1,
  }
}

// 2C — Rounding: round a 3-digit number (never already a multiple of 100)
// to the nearest 100
export function L3_2C(lang) {
  let n
  do { n = rand(101, 899) } while (n % 100 === 0)
  return {
    moduleType: 'numpad',
    question: w(lang).roundToNearest100(n),
    answer: String(Math.round(n / 100) * 100),
  }
}

// 3B — Bridging 10: 2-digit + 1-digit, must overshoot past the next ten
// (not land exactly on it -- units digit must be 2-9 so a single-digit b
// can push it strictly past, e.g. 17 + 6 = 23, never 64 + 6 = 70)
export function L3_3B() {
  let a
  do { a = rand(10, 99) } while (a % 10 < 2)
  const b = rand(11 - (a % 10), 9)
  return {
    moduleType: 'numpad',
    question: `${a} + ${b}`,
    answer: String(a + b),
  }
}

// 3C — Column addition: both addends 2-digit, 21-49
export function L3_3C() {
  const a = rand(21, 49)
  const b = rand(21, 49)
  return {
    moduleType: 'numpad',
    question: `${a} + ${b}`,
    answer: String(a + b),
  }
}

// 4A — Counting on: 2-digit (21-49) minus 1-digit, always crosses a tens boundary
export function L3_4A() {
  let a
  do { a = rand(21, 49) } while (a % 10 === 9)
  const b = rand((a % 10) + 1, 9)
  return {
    moduleType: 'numpad',
    question: `${a} − ${b}`,
    answer: String(a - b),
  }
}

// 4B — Column subtraction: both 2-digit, no borrowing required. Laid out
// as an actual column (one number above the other, ruled line below) to
// model how it should be written in their book, not just "a − b" inline.
export function L3_4B() {
  let a, b
  do {
    a = rand(10, 99)
    b = rand(10, a - 1)
  } while ((a % 10) < (b % 10))
  return {
    moduleType: 'numpad',
    column: { a, b, operator: '−' },
    answer: String(a - b),
  }
}

// 5A — Times tables: 3, 4 and 6 only
export function L3_5A() {
  const t = pick([3, 4, 6])
  const a = rand(1, 10)
  return {
    moduleType: 'numpad',
    question: `${a} × ${t}`,
    answer: String(a * t),
  }
}

// 6A — Sharing: still the Share drag/tap module, max 20 sweets / 4 boxes
export function L3_6A() {
  const boxes = rand(2, 4)
  const maxEach = Math.max(1, Math.floor(20 / boxes))
  const each = rand(1, maxEach)
  return {
    moduleType: 'share',
    totalSweets: boxes * each,
    boxes,
    answer: each,
  }
}

// 6B — Grouping: factor 4-6, multiple 12-30
export function L3_6B(lang) {
  let divisor, total
  do {
    divisor = rand(4, 6)
    total = rand(12, 30)
  } while (total % divisor !== 0)
  return {
    moduleType: 'numpad',
    question: w(lang).howManyXInY(divisor, total),
    answer: String(total / divisor),
  }
}

// 7A — Doubling: 2-digit numbers up to 50
export function L3_7A(lang) {
  const n = rand(10, 50)
  const correct = n * 2
  const distractors = [...new Set([correct - 2, correct + 2, correct - 1, correct + 1, correct - 10, correct + 10])]
    .filter(v => v > 0 && v !== correct)
  const options = shuffle([correct, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: w(lang).doubleEq(n),
    options,
    correctIndex: options.indexOf(String(correct)),
  }
}

// 7B — Halving: now a plain numpad question, X strictly between 26 and 50
export function L3_7B(lang) {
  const half = rand(13, 25)
  const n = half * 2
  return {
    moduleType: 'numpad',
    question: w(lang).halfOfEq(n),
    answer: String(half),
  }
}

// 8A — Fractions: "¼ of 12 =", question number a multiple of 4 strictly
// between 10 and 30 (quarter only at this level)
export function L3_8A(lang) {
  const quarter = pick([3, 4, 5, 6, 7]) // n = quarter*4 -> 12,16,20,24,28
  const n = quarter * 4
  const distractors = [...new Set([quarter - 2, quarter - 1, quarter + 1, quarter + 2, quarter + 3, n, n + 1])]
    .filter(v => v > 0 && v !== quarter)
  const options = shuffle([quarter, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: w(lang).quarterOfFraction(n),
    options,
    correctIndex: options.indexOf(String(quarter)),
  }
}

// 9A — Missing numbers: "3 × ___ = 18", factor from the 2/3/4/5 times tables
export function L3_9A() {
  const factor = pick([2, 3, 4, 5])
  const missing = rand(1, 10)
  return {
    moduleType: 'numpad',
    question: `${factor} × ___ = ${factor * missing}`,
    answer: String(missing),
  }
}

// 9B — Multi-step problems: "You have 24 sweets. You give 6 away.
// You get 5 back. How many sweets do you have?" -- item noun varies
export function L3_9B(lang) {
  const start = rand(15, 30)
  const giveAway = rand(3, 10)
  let getMore
  do { getMore = rand(2, 8) } while (getMore === giveAway) // avoid the trivial X - Y + Y = X case
  const itemIndex = randomItemIndex()
  return {
    moduleType: 'numpad',
    question: w(lang).wordProblemItems(start, giveAway, getMore, itemIndex),
    answer: String(start - giveAway + getMore),
  }
}

// 9C — Patterns: starts at 1, 2 or 3 (for variety), steps up by a
// consistent gap of either 3 or 4 (picked once, same gap the whole way
// through) — e.g. 2, 5, 8, 11, 14
export function L3_9C() {
  const step = pick([3, 4])
  const seq = [pick([1, 2, 3])]
  for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + step)
  const hideIndex = rand(1, 4)
  const answer = seq[hideIndex]
  const distractorPool = [answer - 2, answer - 1, answer + 1, answer + 2, answer + 3]
    .filter(v => v > 0 && v !== answer && !seq.includes(v))
  const distractors = shuffle([...new Set(distractorPool)]).slice(0, 3)
  return {
    moduleType: 'fill_blank',
    sequence: seq.map((v, i) => (i === hideIndex ? null : v)),
    options: shuffle([answer, ...distractors]),
    answer,
  }
}
