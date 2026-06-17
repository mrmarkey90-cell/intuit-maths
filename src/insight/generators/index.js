import * as level1 from './level1'
import * as level2 from './level2'
import * as level3 from './level3'

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
  3: {
    '1A': level3.L3_1A,
    '1B': level3.L3_1B,
    '1E': level3.L3_1E,
    '1F': level3.L3_1F,
    '2A': level3.L3_2A,
    '2B': level3.L3_2B,
    '2C': level3.L3_2C,
    '3B': level3.L3_3B,
    '3C': level3.L3_3C,
    '4A': level3.L3_4A,
    '4B': level3.L3_4B,
    '5A': level3.L3_5A,
    '6A': level3.L3_6A,
    '6B': level3.L3_6B,
    '7A': level3.L3_7A,
    '7B': level3.L3_7B,
    '8A': level3.L3_8A,
    '9A': level3.L3_9A,
    '9B': level3.L3_9B,
    '9C': level3.L3_9C,
  },
  // Level 4+ generators added here as each level is built
}

export function generateInsightQuestion(subdomain, level, language = 'en') {
  const gen = generators[level]?.[subdomain]
  if (!gen) return null
  return gen(language)
}
