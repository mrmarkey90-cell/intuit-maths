function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 1A — Counting: find a number on a 1-10 number line (2-9 — the endpoints
// are already labelled, so asking for those would be trivial)
export function L1_1A() {
  const n = rand(2, 9)
  return {
    moduleType: 'number_line',
    prompt: `Find ${n}`,
    min: 1,
    max: 10,
    answer: n,
  }
}

// 2A — Sequencing: drag smallest to largest
export function L1_2A() {
  const vals = new Set()
  while (vals.size < 4) vals.add(rand(1, 20))
  return {
    moduleType: 'drag_sort',
    prompt: 'Drag smallest to largest',
    values: [...vals],
  }
}

// 2B — Comparing: "Which is bigger: 3 or 7?"
export function L1_2B() {
  let a = rand(1, 20)
  let b = rand(1, 20)
  while (a === b) b = rand(1, 20)
  return {
    moduleType: 'circle',
    prompt: 'Which is bigger?',
    options: [String(a), String(b)],
    correctIndex: a > b ? 0 : 1,
  }
}

// 3A — Bonds to 10: choose two numbers from a selection that add up to 10
export function L1_3A() {
  const a = rand(1, 9)
  const b = 10 - a
  const pool = new Set([a, b])
  while (pool.size < 5) pool.add(rand(1, 9))
  return {
    moduleType: 'pair_sum',
    prompt: 'Choose two numbers that add up to 10',
    options: shuffle([...pool]),
    target: 10,
  }
}

// 4A — Subtracting by counting on: "7 - 4 = ?" (b always strictly less than a)
export function L1_4A() {
  const a = rand(4, 10)
  const b = rand(1, a - 1)
  return {
    moduleType: 'numpad',
    question: `${a} − ${b}`,
    answer: String(a - b),
  }
}

// 6A — Sharing: drag sweets into boxes equally (boxes capped at 4 and
// totals capped so the pool/boxes always fit on screen without scrolling)
export function L1_6A() {
  const boxes = rand(2, 4)
  const maxEach = Math.max(1, Math.floor(12 / boxes))
  const each = rand(1, maxEach)
  const totalSweets = boxes * each
  return {
    moduleType: 'share',
    totalSweets,
    boxes,
    answer: each,
  }
}

// 7A — Doubling: "Which is double 4? Circle: 2, 4, 6, 8" (kept under 10, avoids bridging)
export function L1_7A() {
  const n = rand(1, 5)
  const correct = n * 2
  const distractors = [...new Set([correct - 2, correct + 2, correct - 1, correct + 1, n])]
    .filter(v => v > 0 && v !== correct)
  const options = shuffle([correct, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: `Which is double ${n}?`,
    options,
    correctIndex: options.indexOf(String(correct)),
  }
}

// 7B — Halving: "Half of 8?" with 4 multiple-choice options
export function L1_7B() {
  const half = rand(1, 5)
  const n = half * 2
  const candidates = [half - 2, half - 1, half + 1, half + 2, half + 3, n, n + 1]
  const distractors = [...new Set(candidates)].filter(v => v > 0 && v !== half)
  const options = shuffle([half, ...shuffle(distractors).slice(0, 3)]).map(String)
  return {
    moduleType: 'circle',
    prompt: `Half of ${n}?`,
    options,
    correctIndex: options.indexOf(String(half)),
  }
}

// 9A — Missing numbers: "___ + 3 = 7"
export function L1_9A() {
  const b = rand(1, 9)
  const total = rand(b + 1, 10)
  return {
    moduleType: 'numpad',
    question: `___ + ${b} = ${total}`,
    answer: String(total - b),
  }
}

// 9C — Patterns: always "2, 4, 6, 8, 10", hiding one of 4/6/8/10 (never 2).
// Child drags the correct value into the gap from 4 plausible options.
export function L1_9C() {
  const seq = [2, 4, 6, 8, 10]
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
