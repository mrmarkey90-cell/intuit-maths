import { w, randomShopItemIndex } from './words'

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 1A — Counting: "75, 100, 125, ___?" -- counting in steps of 25, 30 or 40
export function L4_1A() {
  const step = pick([25, 30, 40])
  const startMultiple = rand(1, 4)
  const terms = [0, 1, 2].map(i => (startMultiple + i) * step)
  return {
    moduleType: 'numpad',
    question: `${terms.join(', ')}, ___?`,
    answer: String((startMultiple + 3) * step),
  }
}

// 1B — Partitioning: 4-digit number splits into thousands + hundreds +
// tens + units, all four boxes always required (see PartitionModule)
export function L4_1B() {
  const th = rand(1, 9)
  const h = rand(0, 9)
  const t = rand(0, 9)
  const u = rand(0, 9)
  return {
    moduleType: 'partition',
    number: th * 1000 + h * 100 + t * 10 + u,
    parts: [th * 1000, h * 100, t * 10, u],
  }
}

// 1C — Decimals: drag the arrow to a 1-decimal-place target between 1.1
// and 9.9 (never a whole number) on the single-unit number line containing it
export function L4_1C(lang) {
  const whole = rand(1, 9)
  const tenths = rand(1, 9)
  const target = Math.round((whole + tenths / 10) * 10) / 10
  const min = Math.floor(target)
  const max = min + 1
  return {
    moduleType: 'number_line',
    prompt: `${w(lang).find} ${target}`,
    min,
    max,
    step: 0.1,
    answer: target,
  }
}

// 1E — Even / Odd: same approach as Level 3, wider range
export function L4_1E(lang) {
  const wantEven = Math.random() < 0.5
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 5) pool.add(rand(25, 100))
    values = [...pool]
    correctIndices = values.map((v, i) => ((v % 2 === 0) === wantEven ? i : -1)).filter(i => i !== -1)
  } while (correctIndices.length === 0 || correctIndices.length === values.length)
  return {
    moduleType: 'multi_select',
    prompt: wantEven ? w(lang).findEvenNumbers : w(lang).findOddNumbers,
    options: values,
    correctIndices,
  }
}

// 1F — Multiples: "Which are in the 3 times table?" from 1-30
export function L4_1F(lang) {
  const table = 3
  let values, correctIndices
  do {
    const pool = new Set()
    while (pool.size < 5) pool.add(rand(1, 30))
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

// 1G — Factors: "Find all factors of 10" -- mixes the real factors with
// plausible non-factor distractors into a 5-8 tile grid
export function L4_1G(lang) {
  const n = rand(6, 15)
  const factors = []
  for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i)
  const nonFactors = []
  for (let i = 1; i <= n + 2; i++) if (n % i !== 0) nonFactors.push(i)
  const distractorCount = Math.max(1, Math.min(nonFactors.length, 7 - factors.length))
  const distractors = shuffle(nonFactors).slice(0, distractorCount)
  const values = shuffle([...factors, ...distractors])
  const correctIndices = values.map((v, i) => (n % v === 0 ? i : -1)).filter(i => i !== -1)
  return {
    moduleType: 'multi_select',
    prompt: w(lang).findAllFactorsOf(n),
    options: values,
    correctIndices,
  }
}

// 2A — Sequencing: drag smallest to largest, range 100-999
export function L4_2A(lang) {
  const vals = new Set()
  while (vals.size < 4) vals.add(rand(100, 999))
  return {
    moduleType: 'drag_sort',
    prompt: w(lang).dragSmallestToLargest,
    values: [...vals],
  }
}

// 2B — Comparing: "Which is bigger?" with 2-decimal-place numbers (e.g. 4.21 vs 4.12)
export function L4_2B(lang) {
  function randDecimal() {
    return Math.round((rand(100, 999) / 100) * 100) / 100
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

// 2C — Rounding: round a 4-digit number (never already a multiple of
// 1,000) to the nearest 1,000
export function L4_2C(lang) {
  let n
  do { n = rand(1001, 8999) } while (n % 1000 === 0)
  return {
    moduleType: 'numpad',
    question: w(lang).roundToNearest1000(n),
    answer: String(Math.round(n / 1000) * 1000),
  }
}

// 3C — Column addition: both addends 3-digit, laid out as a real column
export function L4_3C() {
  const a = rand(100, 899)
  const b = rand(100, 899)
  return {
    moduleType: 'numpad',
    column: { a, b, operator: '+' },
    answer: String(a + b),
  }
}

// 4B — Column subtraction: both 3-digit, no borrowing required anywhere
// (every digit of b <= the matching digit of a)
export function L4_4B() {
  let a, b
  do {
    a = rand(100, 999)
    b = rand(100, a - 1)
  } while ((a % 10) < (b % 10) || (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10))
  return {
    moduleType: 'numpad',
    column: { a, b, operator: '−' },
    answer: String(a - b),
  }
}

// 4C — Column w/ Borrowing: both 3-digit, at least one digit position
// requires borrowing (the complement of 4B's "no borrowing" case)
export function L4_4C() {
  let a, b
  do {
    a = rand(100, 999)
    b = rand(100, a - 1)
  } while (!((a % 10) < (b % 10) || (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10)))
  return {
    moduleType: 'numpad',
    column: { a, b, operator: '−' },
    answer: String(a - b),
  }
}

// 5A — Times tables: 7, 8 and 9 only
export function L4_5A() {
  const t = pick([7, 8, 9])
  const a = rand(1, 10)
  return {
    moduleType: 'numpad',
    question: `${a} × ${t}`,
    answer: String(a * t),
  }
}

// 5B — Multiplying larger numbers: 2-digit times 1-digit
export function L4_5B() {
  const a = rand(10, 99)
  const b = rand(2, 9)
  return {
    moduleType: 'numpad',
    question: `${a} × ${b}`,
    answer: String(a * b),
  }
}

// 5C — Multiplying by partition: only the final answer is actually
// marked (per the curriculum note), so this is a plain numpad question
// rather than a scored drag-the-partition-tiles step
export function L4_5C() {
  const a = rand(12, 29)
  const b = rand(2, 9)
  return {
    moduleType: 'numpad',
    question: `${a} × ${b}`,
    answer: String(a * b),
  }
}

// 6B — Grouping: factor 6-8, multiple 24-60
export function L4_6B(lang) {
  let divisor, total
  do {
    divisor = rand(6, 8)
    total = rand(24, 60)
  } while (total % divisor !== 0)
  return {
    moduleType: 'numpad',
    question: w(lang).howManyXInY(divisor, total),
    answer: String(total / divisor),
  }
}

// 6C — Dividing multiple digits: 2-digit ÷ 1-digit, exact, up to 80
export function L4_6C() {
  const b = rand(2, 9)
  const maxQ = Math.floor(80 / b)
  const minQ = Math.max(2, Math.ceil(10 / b))
  const quotient = rand(minQ, maxQ)
  return {
    moduleType: 'numpad',
    question: `${b * quotient} ÷ ${b}`,
    answer: String(quotient),
  }
}

// 7A — Doubling: 3-digit numbers up to 299
export function L4_7A(lang) {
  const n = rand(100, 299)
  const correct = n * 2
  const distractors = [...new Set([correct - 2, correct + 2, correct - 1, correct + 1, correct - 100, correct + 100])]
    .filter(v => v > 0 && v !== correct)
  const options = shuffle([correct, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: w(lang).doubleEq(n),
    options,
    correctIndex: options.indexOf(String(correct)),
  }
}

// 7B — Halving: plain numpad, X picked so half is a whole number
export function L4_7B(lang) {
  const half = rand(51, 150)
  const n = half * 2
  return {
    moduleType: 'numpad',
    question: w(lang).halfOfEq(n),
    answer: String(half),
  }
}

// 8A — Fractions: varying numerators of quarters (1/4, 2/4 or 3/4) of a
// number 40-100 that's always a multiple of 4
export function L4_8A(lang) {
  const base = rand(10, 25) * 4
  const numerator = rand(1, 3)
  return {
    moduleType: 'numpad',
    question: w(lang).fractionOfEq(numerator, 4, base),
    answer: String((base * numerator) / 4),
  }
}

// 8C — Percentages: 10% or 50% of a number 50-98, always a whole-number answer
export function L4_8C(lang) {
  const percent = pick([10, 50])
  const base = percent === 10
    ? pick([50, 60, 70, 80, 90])
    : rand(25, 49) * 2
  return {
    moduleType: 'numpad',
    question: w(lang).percentOfEq(percent, base),
    answer: String((base * percent) / 100),
  }
}

// 9A — Missing numbers: "___ × 6 = 48", factor from the 5/6/8/10 times tables
export function L4_9A() {
  const factor = pick([5, 6, 8, 10])
  const missing = rand(1, 10)
  return {
    moduleType: 'numpad',
    question: `${factor} × ___ = ${factor * missing}`,
    answer: String(missing),
  }
}

// 9B — Multi-step problems: "A pencil costs £8. I buy 3. I pay with
// £30. How much change do I get?" -- item noun varies
export function L4_9B(lang) {
  const cost = rand(6, 9)
  const quantity = rand(3, 5)
  const totalCost = cost * quantity
  let paid
  do { paid = rand(25, 50) } while (paid <= totalCost)
  const itemIndex = randomShopItemIndex()
  return {
    moduleType: 'numpad',
    question: w(lang).wordProblemShopping(cost, quantity, paid, itemIndex),
    answer: String(paid - totalCost),
  }
}

// 9C — Patterns: starts at 1-9, steps up by a consistent gap of 4, 5 or 6
export function L4_9C() {
  const step = pick([4, 5, 6])
  const seq = [rand(1, 9)]
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
