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

function isPrime(n) {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

// 1B — Partitioning: a 1-decimal-place number splits into whole + tenths
// (e.g. 3.6 -> [3, 0.6]), both boxes always required (see PartitionModule)
export function L5_1B() {
  const whole = rand(1, 9)
  const tenths = rand(1, 9)
  return {
    moduleType: 'partition',
    number: Math.round((whole + tenths / 10) * 10) / 10,
    parts: [whole, tenths / 10],
    decimal: true,
  }
}

// 1C — Decimals: estimate a position on a bare 0-1 line with no notches,
// arrow moves smoothly, within 0.15 of the target counts as correct
export function L5_1C(lang) {
  const target = rand(10, 90) / 100
  return {
    moduleType: 'number_line',
    prompt: `${w(lang).find} ${target}`,
    min: 0,
    max: 1,
    continuous: true,
    tolerance: 0.15,
    answer: target,
  }
}

// 1D — Negatives: "-3 + 5" on a -10 to 10 number line (first negatives subdomain)
export function L5_1D() {
  const a = -rand(1, 9)
  const b = rand(1, 9)
  return {
    moduleType: 'number_line',
    prompt: `${a} + ${b}`,
    min: -10,
    max: 10,
    labelPoints: [-10, 0, 10],
    answer: a + b,
  }
}

// 1F — Multiples: table varies between 7, 8 and 9 now (not fixed), 6 tiles
export function L5_1F(lang) {
  const table = pick([7, 8, 9])
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rand(1, 50))
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

// 1G — Factors: every number 1-25 shown in a fixed 5x5 grid, tap the
// factors of N (a fresh layout from the usual mixed-tile approach)
export function L5_1G(lang) {
  const n = rand(12, 24)
  const options = Array.from({ length: 25 }, (_, i) => i + 1)
  const correctIndices = options.map((v, i) => (n % v === 0 ? i : -1)).filter(i => i !== -1)
  return {
    moduleType: 'multi_select',
    prompt: w(lang).findAllFactorsOf(n),
    options,
    correctIndices,
    columns: 5,
  }
}

// 1H — Primes: range 2-15, 6 tiles (first time this subdomain is active)
export function L5_1H(lang) {
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rand(2, 15))
    values = [...pool]
    correctIndices = values.map((v, i) => (isPrime(v) ? i : -1)).filter(i => i !== -1)
  } while (correctIndices.length === 0 || correctIndices.length === values.length)
  return {
    moduleType: 'multi_select',
    prompt: w(lang).whichArePrime,
    options: values,
    correctIndices,
  }
}

// 2A — Sequencing: drag smallest to largest, 1-decimal-place values
export function L5_2A(lang) {
  const pool = new Set()
  while (pool.size < 4) pool.add(rand(0, 99))
  return {
    moduleType: 'drag_sort',
    prompt: w(lang).dragSmallestToLargest,
    values: [...pool].map(v => v / 10),
  }
}

// 2B — Comparing: 3-digit, 2-decimal-place numbers (e.g. 4.21 vs 4.12)
export function L5_2B(lang) {
  function randDecimal() {
    const whole = rand(1, 9)
    const hundredths = rand(0, 99)
    return Math.round((whole + hundredths / 100) * 100) / 100
  }
  let a = randDecimal()
  let b = randDecimal()
  while (a === b) b = randDecimal()
  return {
    moduleType: 'circle',
    prompt: w(lang).whichIsBigger,
    options: [a.toFixed(2), b.toFixed(2)],
    correctIndex: a > b ? 0 : 1,
  }
}

// 2C — Rounding: a 1-decimal-place number to the nearest whole number
export function L5_2C(lang) {
  const whole = rand(1, 9)
  const tenths = rand(1, 9)
  const n = Math.round((whole + tenths / 10) * 10) / 10
  return {
    moduleType: 'numpad',
    question: w(lang).roundToNearestWhole(n),
    answer: String(Math.round(n)),
  }
}

// 3C — Column addition: both addends 4-digit
export function L5_3C() {
  const a = rand(1000, 8999)
  const b = rand(1000, 8999)
  return {
    moduleType: 'numpad',
    column: { a, b, operator: '+' },
    answer: String(a + b),
  }
}

// 3D — Column w/ Decimals: both 1-decimal-place, laid out as a column
export function L5_3D() {
  const aTimes10 = rand(10, 99)
  const bTimes10 = rand(10, 99)
  return {
    moduleType: 'numpad',
    column: { a: (aTimes10 / 10).toFixed(1), b: (bTimes10 / 10).toFixed(1), operator: '+' },
    answer: ((aTimes10 + bTimes10) / 10).toFixed(1),
    decimal: true,
  }
}

// 4D — Subtracting with decimals: both 1-decimal-place, a > b, column layout
export function L5_4D() {
  const aTimes10 = rand(20, 99)
  const bTimes10 = rand(10, aTimes10 - 1)
  return {
    moduleType: 'numpad',
    column: { a: (aTimes10 / 10).toFixed(1), b: (bTimes10 / 10).toFixed(1), operator: '−' },
    answer: ((aTimes10 - bTimes10) / 10).toFixed(1),
    decimal: true,
  }
}

// 5A — Times tables: 8, 9 and 11 only, first factor up to 12
export function L5_5A() {
  const t = pick([8, 9, 11])
  const a = rand(1, 12)
  return {
    moduleType: 'numpad',
    question: `${a} × ${t}`,
    answer: String(a * t),
  }
}

// 5B — Multiplying larger numbers: 3-digit times 1-digit
export function L5_5B() {
  const a = rand(100, 999)
  const b = rand(2, 9)
  return {
    moduleType: 'numpad',
    question: `${a} × ${b}`,
    answer: String(a * b),
  }
}

// 5D — Multiplying decimals: 1-decimal-place times 1-digit
export function L5_5D() {
  const aTimes10 = rand(10, 99)
  const b = rand(2, 9)
  return {
    moduleType: 'numpad',
    question: `${(aTimes10 / 10).toFixed(1)} × ${b}`,
    answer: ((aTimes10 * b) / 10).toFixed(1),
    decimal: true,
  }
}

// 6C — Dividing multiple digits: 3-digit ÷ 1-digit, exact, up to 500
export function L5_6C() {
  const b = rand(2, 9)
  const minQ = Math.max(12, Math.ceil(100 / b))
  const maxQ = Math.floor(500 / b)
  const quotient = rand(minQ, maxQ)
  return {
    moduleType: 'numpad',
    question: `${b * quotient} ÷ ${b}`,
    answer: String(quotient),
  }
}

// 7A — Doubling: 1-decimal-place numbers up to 5.0
export function L5_7A(lang) {
  const nTimes10 = rand(10, 50)
  const correctTimes10 = nTimes10 * 2
  const distractorsTimes10 = [...new Set([
    correctTimes10 - 2, correctTimes10 + 2, correctTimes10 - 1, correctTimes10 + 1, correctTimes10 - 10,
  ])].filter(v => v > 0 && v !== correctTimes10)
  const options = shuffle([correctTimes10, ...shuffle(distractorsTimes10).slice(0, 3)])
    .map(v => (v / 10).toFixed(1))
  return {
    moduleType: 'circle',
    prompt: w(lang).doubleEq((nTimes10 / 10).toFixed(1)),
    options,
    correctIndex: options.indexOf((correctTimes10 / 10).toFixed(1)),
  }
}

// 7B — Halving: 1-decimal-place numpad question
export function L5_7B(lang) {
  const halfTimes10 = rand(10, 99)
  const nTimes10 = halfTimes10 * 2
  return {
    moduleType: 'numpad',
    question: w(lang).halfOfEq((nTimes10 / 10).toFixed(1)),
    answer: (halfTimes10 / 10).toFixed(1),
    decimal: true,
  }
}

// 8A — Fractions: varying numerators of fifths and tenths, base 60-150
export function L5_8A(lang) {
  const denominator = pick([5, 10])
  const base = rand(Math.ceil(60 / denominator), Math.floor(150 / denominator)) * denominator
  const numerator = rand(1, denominator - 1)
  return {
    moduleType: 'numpad',
    question: w(lang).fractionOfEq(numerator, denominator, base),
    answer: String((base * numerator) / denominator),
  }
}

// 8C — Percentages: 20% or 25% of a number 50-120
export function L5_8C(lang) {
  const percent = pick([20, 25])
  const base = percent === 20 ? rand(10, 24) * 5 : rand(13, 30) * 4
  return {
    moduleType: 'numpad',
    question: w(lang).percentOfEq(percent, base),
    answer: String((base * percent) / 100),
  }
}

// 8D — Conversions: match each fraction to its decimal -- the same 4
// pairs every time (per the curriculum note), only the right column's
// display order shuffles
const FRACTION_DECIMAL_PAIRS = [
  { left: '½', right: 0.5 },
  { left: '¼', right: 0.25 },
  { left: '¾', right: 0.75 },
  { left: '⅕', right: 0.2 },
]
export function L5_8D() {
  const left = FRACTION_DECIMAL_PAIRS.map(p => p.left)
  const rightValues = FRACTION_DECIMAL_PAIRS.map(p => p.right)
  const right = shuffle(rightValues)
  return {
    moduleType: 'match',
    left,
    right,
    correctIndices: rightValues.map(v => right.indexOf(v)),
  }
}

// 9A — Missing numbers: "4 x ___ + 3 = 23", single-digit numbers only
export function L5_9A() {
  const a = rand(2, 9)
  const x = rand(1, 9)
  const b = rand(1, 9)
  return {
    moduleType: 'numpad',
    question: `${a} × ___ + ${b} = ${a * x + b}`,
    answer: String(x),
  }
}

// 9B — Multi-step problems: "Pencils are 45p each. I buy 6. I had £5.
// How much change do you get?" -- answer given in pence
export function L5_9B(lang) {
  let pence, quantity, hadPounds, changePence
  do {
    pence = rand(20, 50)
    quantity = rand(3, 5)
    hadPounds = rand(5, 10)
    changePence = hadPounds * 100 - pence * quantity
  } while (changePence % 10 === 0) // keep the pence digit non-zero so "2.34" can't be mistyped as "2.3"
  const itemIndex = randomItemIndex()
  return {
    moduleType: 'numpad',
    question: w(lang).wordProblemShoppingPence(itemIndex, pence, quantity, hadPounds),
    answer: (changePence / 100).toFixed(2),
    decimal: true,
    prefix: '£',
  }
}

// 9C — Patterns: starts 1-20, steps up by a consistent gap of 5-9
export function L5_9C() {
  const step = rand(5, 9)
  const seq = [rand(1, 20)]
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
