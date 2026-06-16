import * as level1 from './level1'

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
  // Level 2+ generators added here as each level is built
}

export function generateInsightQuestion(subdomain, level) {
  const gen = generators[level]?.[subdomain]
  if (!gen) return null
  return gen()
}
