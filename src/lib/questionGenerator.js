function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const stages = {
  1: [
    () => {
      const a = rnd(1, 9), b = rnd(1, 9 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: 'within-10' }
    },
    () => {
      const a = rnd(2, 10), b = rnd(1, a - 1)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: 'within-10' }
    },
  ],

  2: [
    () => {
      const a = rnd(1, 18), b = rnd(1, 20 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: 'within-20' }
    },
    () => {
      const a = rnd(3, 20), b = rnd(1, a - 1)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: 'within-20' }
    },
    () => {
      const a = rnd(1, 10)
      return { question: `Double ${a} =`, answer: a * 2, domain: 'multiplication', subdomain: 'doubling' }
    },
    () => {
      const a = rnd(1, 10)
      return { question: `Half of ${a * 2} =`, answer: a, domain: 'division', subdomain: 'halving' }
    },
  ],

  3: [
    () => {
      const a = rnd(10, 89), b = rnd(1, 99 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '2-digit' }
    },
    () => {
      const a = rnd(11, 99), b = rnd(1, a - 1)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: '2-digit' }
    },
    () => {
      const t = pick([2, 5, 10]), a = rnd(1, 12)
      return { question: `${a} × ${t} =`, answer: a * t, domain: 'multiplication', subdomain: `${t}x-table` }
    },
    () => {
      const t = pick([2, 5, 10]), a = rnd(1, 12)
      return { question: `${a * t} ÷ ${t} =`, answer: a, domain: 'division', subdomain: `${t}x-table` }
    },
    () => {
      const a = rnd(1, 10)
      return { question: `½ of ${a * 2} =`, answer: a, domain: 'fractions', subdomain: 'half-of' }
    },
  ],

  4: [
    () => {
      const a = rnd(100, 899), b = rnd(10, 999 - a)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: '3-digit' }
    },
    () => {
      const a = rnd(110, 999), b = rnd(10, a - 10)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: '3-digit' }
    },
    () => {
      const t = rnd(2, 12), a = rnd(2, 12)
      return { question: `${a} × ${t} =`, answer: a * t, domain: 'multiplication', subdomain: 'times-tables' }
    },
    () => {
      const t = rnd(2, 12), a = rnd(2, 12)
      return { question: `${a * t} ÷ ${t} =`, answer: a, domain: 'division', subdomain: 'times-tables' }
    },
    () => {
      const d = pick([2, 3, 4, 5]), whole = rnd(2, 10) * d
      return { question: `¼ of ${whole * 4 / d} =`, answer: whole / d, domain: 'fractions', subdomain: 'unit-fractions' }
    },
    () => {
      const d = pick([2, 4]), whole = rnd(2, 12) * d
      return { question: `${whole} ÷ ${d} =`, answer: whole / d, domain: 'division', subdomain: 'halving-large' }
    },
  ],

  5: [
    () => {
      const a = rnd(-9, 5), b = rnd(1, 10)
      return { question: `${a} + ${b} =`, answer: a + b, domain: 'addition', subdomain: 'negatives' }
    },
    () => {
      const a = rnd(-5, 10), b = rnd(1, 10)
      return { question: `${a} − ${b} =`, answer: a - b, domain: 'subtraction', subdomain: 'negatives' }
    },
    () => {
      const pct = pick([10, 20, 25, 50])
      const whole = rnd(2, 20) * (100 / pct)
      return { question: `${pct}% of ${whole} =`, answer: (whole * pct) / 100, domain: 'percentages', subdomain: 'basic' }
    },
    () => {
      const p = pick([10, 100, 1000]), a = rnd(1, 99)
      return { question: `${a} × ${p} =`, answer: a * p, domain: 'multiplication', subdomain: 'powers-of-10' }
    },
    () => {
      const a = rnd(1, 99)
      return { question: `${a * 10} ÷ 10 =`, answer: a, domain: 'division', subdomain: 'powers-of-10' }
    },
    () => {
      const t = rnd(2, 12), a = rnd(13, 25)
      return { question: `${a} × ${t} =`, answer: a * t, domain: 'multiplication', subdomain: 'beyond-tables' }
    },
  ],

  6: [
    () => {
      const pct = pick([15, 30, 35, 40, 45, 60, 70, 75, 80])
      const mult = pick([20, 40, 60, 80, 100, 200])
      const ans = (mult * pct) / 100
      if (!Number.isInteger(ans)) return stages[5][2]()
      return { question: `${pct}% of ${mult} =`, answer: ans, domain: 'percentages', subdomain: 'complex' }
    },
    () => {
      const a = rnd(1, 4), b = rnd(a + 1, 6)
      const unit = rnd(2, 8)
      const total = (a + b) * unit
      return {
        question: `Share ${total} in ratio ${a}:${b}. Larger share?`,
        answer: b * unit,
        domain: 'ratio',
        subdomain: 'sharing',
      }
    },
    () => {
      const t = rnd(2, 12), a = rnd(13, 30)
      return { question: `${a} × ${t} =`, answer: a * t, domain: 'multiplication', subdomain: 'beyond-tables' }
    },
    () => {
      const a = rnd(1, 9)
      return { question: `${a * 100} ÷ 100 =`, answer: a, domain: 'division', subdomain: 'powers-of-10' }
    },
    () => {
      const d = pick([3, 4, 5, 8, 10]), n = rnd(1, d - 1)
      const whole = rnd(2, 10) * d
      return { question: `${n}/${d} of ${whole} =`, answer: (whole / d) * n, domain: 'fractions', subdomain: 'non-unit' }
    },
  ],
}

export function generateQuestion(stage) {
  const gens = stages[Math.min(Math.max(stage, 1), 6)]
  const q = pick(gens)()
  if (!Number.isInteger(q.answer)) return generateQuestion(stage)
  return q
}
