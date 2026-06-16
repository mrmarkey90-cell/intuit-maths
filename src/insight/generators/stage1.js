function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Counting and quantity recognition — count 1–10 objects
export function counting_quantity() {
  const n = rand(1, 10)
  // Arrange dots in rows of 5 for easy counting
  const row1 = Array(Math.min(n, 5)).fill('●').join(' ')
  const row2 = n > 5 ? Array(n - 5).fill('●').join(' ') : ''
  return {
    question: row2 ? `${row1}\n${row2}` : row1,
    answer: String(n),
  }
}

// Simple addition within 10
export function simple_addition() {
  const a = rand(1, 9)
  const b = rand(1, 10 - a)
  return {
    question: `${a} + ${b}`,
    answer: String(a + b),
  }
}

// Simple subtraction within 10
export function simple_subtraction() {
  const a = rand(1, 10)
  const b = rand(0, a)
  return {
    question: `${a} − ${b}`,
    answer: String(a - b),
  }
}
