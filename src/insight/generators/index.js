import * as level1 from './level1'
import * as level2 from './level2'
import * as level3 from './level3'
import * as level4 from './level4'

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
  4: {
    '1A': level4.L4_1A,
    '1B': level4.L4_1B,
    '1C': level4.L4_1C,
    '1E': level4.L4_1E,
    '1F': level4.L4_1F,
    '1G': level4.L4_1G,
    '2A': level4.L4_2A,
    '2B': level4.L4_2B,
    '2C': level4.L4_2C,
    '3C': level4.L4_3C,
    '4B': level4.L4_4B,
    '4C': level4.L4_4C,
    '5A': level4.L4_5A,
    '5B': level4.L4_5B,
    '5C': level4.L4_5C,
    '6B': level4.L4_6B,
    '6C': level4.L4_6C,
    '7A': level4.L4_7A,
    '7B': level4.L4_7B,
    '8A': level4.L4_8A,
    // 8B (Ratios) intentionally has no generator -- kept in domainConfig
    // but not being implemented at any level, per explicit instruction.
    '8C': level4.L4_8C,
    '9A': level4.L4_9A,
    '9B': level4.L4_9B,
    '9C': level4.L4_9C,
  },
  // Level 5+ generators added here as each level is built
}

export function generateInsightQuestion(subdomain, level, language = 'en') {
  const gen = generators[level]?.[subdomain]
  if (!gen) return null
  return gen(language)
}
