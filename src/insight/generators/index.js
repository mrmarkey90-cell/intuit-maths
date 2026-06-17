import * as level1 from './level1'
import * as level2 from './level2'

const generators = {
  1: {
    '1A': level1.L1_1A,
    '2A': level1.L1_2A,
    '2B': level1.L1_2B,
    '3A': level1.L1_3A,
    '4A': level1.L1_4A,
    '6A': level1.L1_6A,
    '7A': level1.L1_7A,
    '7B': level1.L1_7B,
    '9A': level1.L1_9A,
    '9C': level1.L1_9C,
  },
  2: {
    '1A': level2.L2_1A,
    '1B': level2.L2_1B,
    '1E': level2.L2_1E,
    '2A': level2.L2_2A,
    '2B': level2.L2_2B,
    '2C': level2.L2_2C,
    '3A': level1.L1_3A, // sheet: "Same as 3A" — identical generator at L2
    '3B': level2.L2_3B,
    '4A': level2.L2_4A,
    '5A': level2.L2_5A,
    '6A': level2.L2_6A,
    '6B': level2.L2_6B,
    '7A': level2.L2_7A,
    '7B': level2.L2_7B,
    '8A': level2.L2_8A,
    '9A': level2.L2_9A,
    '9C': level2.L2_9C,
  },
  // Level 3+ generators added here as each level is built
}

export function generateInsightQuestion(subdomain, level) {
  const gen = generators[level]?.[subdomain]
  if (!gen) return null
  return gen()
}
