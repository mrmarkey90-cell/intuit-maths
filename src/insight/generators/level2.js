function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 1A — Counting: find a number on a 1-20 number line, now with labels at
// 1, 5, 10, 15, 20 (not just the endpoints) — so the target is never one
// of the already-labelled points, same trivial-answer reasoning as L1.
export function L2_1A() {
  const labelPoints = [1, 5, 10, 15, 20]
  let n
  do { n = rand(2, 19) } while (labelPoints.includes(n))
  return {
    moduleType: 'number_line',
    prompt: `Find ${n}`,
    min: 1,
    max: 20,
    labelPoints,
    answer: n,
  }
}

// 1B — Partitioning: "Partition 34: 30 + ___?" — randomises which of the
// two slots (tens or units) is hidden.
export function L2_1B() {
  const tens = rand(1, 9)
  const units = rand(0, 9)
  const n = tens * 10 + units
  const hideTens = Math.random() < 0.5
  return {
    moduleType: 'numpad',
    question: hideTens ? `Partition ${n}: ___ + ${units}?` : `Partition ${n}: ${tens * 10} + ___?`,
    answer: String(hideTens ? tens * 10 : units),
  }
}

// 1E — Even / Odd: "17 is..." with two large Even/Odd buttons
export function L2_1E() {
  const n = rand(1, 50)
  const isEven = n % 2 === 0
  return {
    moduleType: 'true_false',
    prompt: `${n} is...`,
    options: ['Even', 'Odd'],
    correctIndex: isEven ? 0 : 1,
  }
}

// 2A — Sequencing: drag smallest to largest, now with 2-digit numbers
export function L2_2A() {
  const vals = new Set()
  while (vals.size < 4) vals.add(rand(10, 99))
  return {
    moduleType: 'drag_sort',
    prompt: 'Drag smallest to largest',
    values: [...vals],
  }
}

// 2B — Comparing: "Which is bigger?" with 2-digit numbers
export function L2_2B() {
  let a = rand(10, 99)
  let b = rand(10, 99)
  while (a === b) b = rand(10, 99)
  return {
    moduleType: 'circle',
    prompt: 'Which is bigger?',
    options: [String(a), String(b)],
    correctIndex: a > b ? 0 : 1,
  }
}

// 2C — Rounding: round a 2-digit number (never already a multiple of 10)
// to the nearest 10
export function L2_2C() {
  let n
  do { n = rand(10, 40) } while (n % 10 === 0)
  return {
    moduleType: 'numpad',
    question: `Round ${n} to the nearest 10`,
    answer: String(Math.round(n / 10) * 10),
  }
}

// 3B — Bridging 10: both addends strictly between 5 and 10
export function L2_3B() {
  const a = rand(6, 9)
  const b = rand(6, 9)
  return {
    moduleType: 'numpad',
    question: `${a} + ${b}`,
    answer: String(a + b),
  }
}

// 4A — Subtracting by counting on: 2-digit minus 1-digit, always crossing
// the ten boundary (result lands back in single digits)
export function L2_4A() {
  let a, b
  do {
    a = rand(11, 19)
    b = rand(1, 9)
  } while (a - b < 1 || a - b > 9)
  return {
    moduleType: 'numpad',
    question: `${a} − ${b}`,
    answer: String(a - b),
  }
}

// 5A — Times tables: 2, 5 and 10 only
export function L2_5A() {
  const t = pick([2, 5, 10])
  const a = rand(1, 10)
  return {
    moduleType: 'numpad',
    question: `${a} × ${t}`,
    answer: String(a * t),
  }
}

// 6A — Sharing: max 15 sweets, max 3 boxes
export function L2_6A() {
  const boxes = rand(2, 3)
  const maxEach = Math.max(1, Math.floor(15 / boxes))
  const each = rand(1, maxEach)
  return {
    moduleType: 'share',
    totalSweets: boxes * each,
    boxes,
    answer: each,
  }
}

// 6B — Grouping: "How many 3s in 12?"
export function L2_6B() {
  const divisor = rand(2, 5)
  const groups = rand(2, 6)
  return {
    moduleType: 'numpad',
    question: `How many ${divisor}s in ${divisor * groups}?`,
    answer: String(groups),
  }
}

// 7A — Doubling: 2-digit numbers up to 20 (picks up where L1's 1-5 left off)
export function L2_7A() {
  const n = rand(6, 20)
  const correct = n * 2
  const distractors = [...new Set([correct - 2, correct + 2, correct - 1, correct + 1, correct - 10, correct + 10])]
    .filter(v => v > 0 && v !== correct)
  const options = shuffle([correct, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: `Double ${n} =`,
    options,
    correctIndex: options.indexOf(String(correct)),
  }
}

// Shared by 7B and 8A — halving a number strictly between 10 and 20
// (so the half itself is always a whole number)
function halvingQuestion(promptFor) {
  const half = rand(6, 9)
  const n = half * 2
  const distractors = [...new Set([half - 2, half - 1, half + 1, half + 2, half + 3, n, n + 1])]
    .filter(v => v > 0 && v !== half)
  const options = shuffle([half, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: promptFor(n),
    options,
    correctIndex: options.indexOf(String(half)),
  }
}

// 7B — Halving: "Half of 20 ="
export function L2_7B() {
  return halvingQuestion(n => `Half of ${n} =`)
}

// 8A — Fractions: "½ of 10 =" (half only at this level)
export function L2_8A() {
  return halvingQuestion(n => `½ of ${n} =`)
}

// 9A — Missing numbers: "___ + 14 = 20"
export function L2_9A() {
  const b = rand(10, 18)
  const answer = rand(1, 9)
  return {
    moduleType: 'numpad',
    question: `___ + ${b} = ${b + answer}`,
    answer: String(answer),
  }
}

// 9C — Patterns: multiples of 3 (3, 6, 9, 12, 15), hiding one of the
// middle four. Same drag-to-blank interaction as L1.
export function L2_9C() {
  const seq = [1, 2, 3, 4, 5].map(n => n * 3)
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
