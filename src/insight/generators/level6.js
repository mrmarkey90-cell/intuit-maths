import { w } from './words'

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

function divisorsOf(n) {
  const out = []
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i)
  return out
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// 1B — Partitioning: a 3-digit number, either 1 or 2 decimal places,
// splits into whole + decimal remainder (both boxes always required)
export function L6_1B() {
  const places = pick([1, 2])
  if (places === 1) {
    const whole = rand(10, 99)
    const tenths = rand(1, 9)
    return {
      moduleType: 'partition',
      number: Math.round((whole + tenths / 10) * 10) / 10,
      parts: [whole, tenths / 10],
      decimal: true,
    }
  }
  const whole = rand(1, 9)
  const hundredths = rand(1, 99)
  return {
    moduleType: 'partition',
    number: Math.round((whole + hundredths / 100) * 100) / 100,
    parts: [whole, hundredths / 100],
    decimal: true,
  }
}

// 1D — Negatives: "-7 - 4 =", always starts with the negative number
export function L6_1D() {
  const a = -rand(1, 9)
  const b = rand(1, 9)
  return {
    moduleType: 'numpad',
    question: `${a} − ${b}`,
    answer: String(a - b),
  }
}

// 1F — Multiples: table varies between 11, 12 and 13, answers up to 10x the table
export function L6_1F(lang) {
  const table = pick([11, 12, 13])
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 6) pool.add(rand(1, table * 10))
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

// 1G — Factors: "Write a factor shared by both 12 and 30" -- numpad
// accepts any valid common factor (other than 1), not just one fixed answer
export function L6_1G(lang) {
  let a, b, common
  do {
    const shared = rand(2, 10)
    a = shared * rand(2, 5)
    b = shared * rand(2, 5)
    common = divisorsOf(a).filter(v => v > 1 && b % v === 0)
  } while (a === b || a > 50 || b > 50 || common.length === 0)
  return {
    moduleType: 'numpad',
    question: w(lang).factorSharedBy(a, b),
    answer: common.map(String),
  }
}

// 1H — Primes: "What is the largest prime below 20?"
export function L6_1H(lang) {
  const n = rand(12, 30)
  let answer = n - 1
  while (!isPrime(answer)) answer--
  return {
    moduleType: 'numpad',
    question: w(lang).largestPrimeBelow(n),
    answer: String(answer),
  }
}

// 2A — Sequencing: drag smallest to largest, up to 3 digits, up to 2
// decimal places, mixed precision within the same question
export function L6_2A(lang) {
  const pool = new Set()
  while (pool.size < 4) {
    const divisor = pick([10, 100])
    pool.add(rand(1, 999) / divisor)
  }
  return {
    moduleType: 'drag_sort',
    prompt: w(lang).dragSmallestToLargest,
    values: [...pool],
  }
}

// 2B — Comparing: both negative, range -50 to -11
export function L6_2B(lang) {
  let a = -rand(11, 50)
  let b = -rand(11, 50)
  while (a === b) b = -rand(11, 50)
  return {
    moduleType: 'circle',
    prompt: w(lang).whichIsHigher,
    options: [String(a), String(b)],
    correctIndex: a > b ? 0 : 1,
  }
}

// 2C — Rounding: a 2-decimal-place number rounded to 1 decimal place
export function L6_2C(lang) {
  const whole = rand(1, 99)
  const hundredths = rand(1, 99)
  const n = Math.round((whole + hundredths / 100) * 100) / 100
  return {
    moduleType: 'numpad',
    question: w(lang).roundToOneDecimalPlace(n.toFixed(2)),
    answer: (Math.round(n * 10) / 10).toFixed(1),
    decimal: true,
  }
}

// 3C — Column addition: 5-digit + 4-digit, comma-formatted for display
export function L6_3C() {
  const a = rand(10000, 99999)
  const b = rand(1000, 9999)
  return {
    moduleType: 'numpad',
    column: { a: a.toLocaleString('en-GB'), b: b.toLocaleString('en-GB'), operator: '+' },
    answer: String(a + b),
  }
}

// 3D — Column w/ Decimals: xx.xx + x.xx
export function L6_3D() {
  const aHundredths = rand(1000, 9999) // 10.00-99.99
  const bHundredths = rand(100, 999) // 1.00-9.99
  return {
    moduleType: 'numpad',
    column: { a: (aHundredths / 100).toFixed(2), b: (bHundredths / 100).toFixed(2), operator: '+' },
    answer: ((aHundredths + bHundredths) / 100).toFixed(2),
    decimal: true,
  }
}

// 4C — Column w/ Borrowing: 5-digit - 4-digit, comma-formatted, some
// borrowing occurs naturally (not forced)
export function L6_4C() {
  const a = rand(10000, 99999)
  const b = rand(1000, 9999)
  return {
    moduleType: 'numpad',
    column: { a: a.toLocaleString('en-GB'), b: b.toLocaleString('en-GB'), operator: '−' },
    answer: String(a - b),
  }
}

// 4D — Subtracting with decimals: xx.x - x.xx, some borrowing
export function L6_4D() {
  const aTenths = rand(100, 999) // 10.0-99.9 (in tenths)
  const aHundredths = aTenths * 10 // same value in hundredths
  const bHundredths = rand(100, Math.min(999, aHundredths - 1)) // 1.00-9.99
  return {
    moduleType: 'numpad',
    column: { a: (aTenths / 10).toFixed(1), b: (bHundredths / 100).toFixed(2), operator: '−' },
    answer: ((aHundredths - bHundredths) / 100).toFixed(2),
    decimal: true,
  }
}

// 5A — Times tables: 7, 9, 11 and 12 only
export function L6_5A() {
  const t = pick([7, 9, 11, 12])
  const a = rand(1, 12)
  return {
    moduleType: 'numpad',
    question: `${a} × ${t}`,
    answer: String(a * t),
  }
}

// 5B — Multiplying larger numbers: 3-digit times 2-digit
export function L6_5B() {
  const a = rand(100, 999)
  const b = rand(11, 99)
  return {
    moduleType: 'numpad',
    question: `${a} × ${b}`,
    answer: String(a * b),
  }
}

// 5D — Multiplying decimals: x.xx multiplied by x
export function L6_5D() {
  const aHundredths = rand(100, 999) // 1.00-9.99
  const b = rand(2, 9)
  return {
    moduleType: 'numpad',
    question: `${(aHundredths / 100).toFixed(2)} × ${b}`,
    answer: ((aHundredths * b) / 100).toFixed(2),
    decimal: true,
  }
}

// 6D — Dividing with decimals: xx.x / x, exact
export function L6_6D() {
  let b, quotientTenths, dividendTenths
  do {
    b = rand(2, 9)
    quotientTenths = rand(10, 99)
    dividendTenths = quotientTenths * b
  } while (dividendTenths < 100 || dividendTenths > 999)
  return {
    moduleType: 'numpad',
    question: `${(dividendTenths / 10).toFixed(1)} ÷ ${b}`,
    answer: (quotientTenths / 10).toFixed(1),
    decimal: true,
  }
}

// 7A — Doubling: 1-decimal-place numbers up to 50.0
export function L6_7A(lang) {
  const nTenths = rand(10, 500)
  const correctTenths = nTenths * 2
  const distractorsTenths = [...new Set([
    correctTenths - 2, correctTenths + 2, correctTenths - 1, correctTenths + 1, correctTenths - 10,
  ])].filter(v => v > 0 && v !== correctTenths)
  const options = shuffle([correctTenths, ...shuffle(distractorsTenths).slice(0, 3)])
    .map(v => (v / 10).toFixed(1))
  return {
    moduleType: 'circle',
    prompt: w(lang).doubleEq((nTenths / 10).toFixed(1)),
    options,
    correctIndex: options.indexOf((correctTenths / 10).toFixed(1)),
  }
}

// 7B — Halving: 3-digit numbers, either 1 or 2 decimal places
export function L6_7B(lang) {
  const places = pick([1, 2])
  const scale = places === 1 ? 10 : 100
  const halfScaled = rand(50, 499)
  const n = (halfScaled * 2) / scale
  const half = halfScaled / scale
  return {
    moduleType: 'numpad',
    question: w(lang).halfOfEq(n.toFixed(places)),
    answer: half.toFixed(places),
    decimal: true,
  }
}

// 8A — Fractions: varying numerators of sixths, sevenths and eighths, base 60-150
export function L6_8A(lang) {
  const denominator = pick([6, 7, 8])
  const base = rand(Math.ceil(60 / denominator), Math.floor(150 / denominator)) * denominator
  const numerator = rand(1, denominator - 1)
  return {
    moduleType: 'numpad',
    question: w(lang).fractionOfEq(numerator, denominator, base),
    answer: String((base * numerator) / denominator),
  }
}

// 8C — Percentages: 5%, 15%, 30% or 35% of a number 50-120
export function L6_8C(lang) {
  const percent = pick([5, 15, 30, 35])
  const g = gcd(percent, 100)
  const denom = 100 / g
  const base = rand(Math.ceil(50 / denom), Math.floor(120 / denom)) * denom
  return {
    moduleType: 'numpad',
    question: w(lang).percentOfEq(percent, base),
    answer: String((base * percent) / 100),
  }
}

// 8D — Conversions: match each decimal to its percentage -- the same 4
// pairs every time (per the curriculum note), only display order shuffles
const DECIMAL_PERCENT_PAIRS = [
  { left: 0.3, right: '30%' },
  { left: 0.6, right: '60%' },
  { left: 0.75, right: '75%' },
  { left: 0.1, right: '10%' },
]
export function L6_8D() {
  const left = DECIMAL_PERCENT_PAIRS.map(p => p.left)
  const rightValues = DECIMAL_PERCENT_PAIRS.map(p => p.right)
  const right = shuffle(rightValues)
  return {
    moduleType: 'match',
    left,
    right,
    correctIndices: rightValues.map(v => right.indexOf(v)),
  }
}

// 9B — Multi-step problems: rectangle area minus a notched-out square,
// shown as a labelled (not-to-scale) diagram
export function L6_9B(lang) {
  const width = rand(10, 16)
  const height = rand(6, 9)
  const cutWidth = rand(2, Math.min(5, height - 1))
  const cutHeight = cutWidth
  return {
    moduleType: 'numpad',
    question: w(lang).areaLeft,
    diagram: { width, height, cutWidth, cutHeight, unit: 'cm' },
    answer: String(width * height - cutWidth * cutHeight),
  }
}

// 9C — Patterns: starts 1-9, varied step pattern (this example is X+1
// each step) -- X itself varies by Y each step, Y range 1-4
export function L6_9C() {
  const startStep = rand(2, 4)
  const startY = rand(1, 4)
  const seq = [rand(1, 9)]
  let step = startStep
  for (let i = 1; i < 5; i++) {
    seq.push(seq[i - 1] + step)
    step += startY
  }
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
