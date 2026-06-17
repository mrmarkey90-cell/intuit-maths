function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Maths vocabulary checked against Y Termiadur Addysg.
const WORDS = {
  en: { double: 'Double', halfOf: 'Half of' },
  cy: { double: 'Dyblu', halfOf: 'Hanner o' },
}

// Shared: all times tables where both factors are 2–9
function timesTables() {
  const a = rnd(2, 9), b = rnd(2, 9)
  return { question: `${a} × ${b} =`, answer: a * b, domain: 'multiplication', subdomain: 'times-tables' }
}

const stages = {
  // 1D + 1D, answer ≤ 10 (never bridging)
  1: [
    () => {
      const a = rnd(1, 9), b = rnd(1, 10 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '1d-no-bridge' }
    },
  ],

  // 1D + 1D (can bridge 10), doubling 1D
  2: [
    () => {
      const a = rnd(1, 9), b = rnd(1, 9)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '1d-bridge' }
    },
    (lang) => {
      const a = rnd(1, 5)
      return { question: `${WORDS[lang].double} ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
  ],

  // 1D + 1D (bridge ok), ×2 / ×5 / ×10 tables (factors 1–10), 2D + 1D (answer < 20)
  3: [
    () => {
      const a = rnd(1, 9), b = rnd(1, 9)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '1d-bridge' }
    },
    () => {
      const t = pick([2, 5, 10]), a = rnd(1, 10)
      return { question: `${a} × ${t} =`, answer: a * t, domain: 'multiplication', subdomain: `${t}x-table` }
    },
    () => {
      const a = rnd(1, 9), b = rnd(10, 19 - a)
      return { question: `${b} + ${a} =`, answer: a + b, domain: 'addition', subdomain: '2d-1d' }
    },
    (lang) => {
      const a = rnd(5, 10)
      return { question: `${WORDS[lang].double} ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
  ],

  // All tables ×2–×9, 1D + 2D (answer < 40), doubling up to 20
  4: [
    () => timesTables(),
    () => {
      const a = rnd(1, 9), b = rnd(10, 39 - a)
      return { question: `${b} + ${a} =`, answer: a + b, domain: 'addition', subdomain: '1d-2d' }
    },
    (lang) => {
      const a = rnd(10, 20)
      return { question: `${WORDS[lang].double} ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
  ],

  // All tables ×2–×9, 2D − 1D (answer < 20), 2D + 1D (answer < 80),
  // doubling (max 20), halving (max 40)
  5: [
    () => timesTables(),
    () => {
      const b = rnd(1, 9), a = rnd(10, 19 + b)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: '2d-1d' }
    },
    () => {
      const b = rnd(1, 9), a = rnd(10, 79 - b)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '2d-1d' }
    },
    (lang) => {
      const a = rnd(15, 30)
      return { question: `${WORDS[lang].double} ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
    (lang) => {
      const a = rnd(1, 20)
      return { question: `${WORDS[lang].halfOf} ${a * 2} =`, answer: a, domain: 'division', subdomain: 'halving' }
    },
  ],

  // All tables ×2–×9, 2D − 1D (answer < 100), 2D + 2D (answer < 100),
  // 2D + 1D, doubling (max 50), halving (max 100)
  6: [
    () => timesTables(),
    () => {
      const a = rnd(10, 99), b = rnd(1, 9)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: '2d-1d' }
    },
    () => {
      const a = rnd(10, 89), b = rnd(10, 99 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '2d-2d' }
    },
    () => {
      const a = rnd(10, 99), b = rnd(1, 9)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '2d-1d' }
    },
    (lang) => {
      const a = rnd(25, 50)
      return { question: `${WORDS[lang].double} ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
    (lang) => {
      const a = rnd(1, 50)
      return { question: `${WORDS[lang].halfOf} ${a * 2} =`, answer: a, domain: 'division', subdomain: 'halving' }
    },
  ],
}

export function generateQuestion(stage, language = 'en') {
  const lang = WORDS[language] ? language : 'en'
  const gens = stages[Math.min(Math.max(stage, 1), 6)]
  const q = pick(gens)(lang)
  if (!Number.isInteger(q.answer)) return generateQuestion(stage, lang)
  return q
}
