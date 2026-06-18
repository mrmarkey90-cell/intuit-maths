import * as level1 from './level1'
import * as level2 from './level2'
import * as level3 from './level3'
import * as level4 from './level4'
import * as level5 from './level5'
import * as level6 from './level6'

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
    // 4C (Column w/ Borrowing) works fine but is deliberately held back
    // to Level 5 -- too difficult for Level 4. Function stays exported
    // from level4.js, ready to be reused once Level 5 is built.
    '5A': level4.L4_5A,
    '5B': level4.L4_5B,
    // 5C is functionally redundant with 5B at this level (same "2 digit
    // x 1 digit" shape) -- left unregistered for Level 4 pending a
    // decision on whether to keep 5C as a subdomain at all.
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
  5: {
    '1B': level5.L5_1B,
    '1C': level5.L5_1C,
    '1D': level5.L5_1D,
    '1F': level5.L5_1F,
    '1G': level5.L5_1G,
    '1H': level5.L5_1H,
    '2A': level5.L5_2A,
    '2B': level5.L5_2B,
    '2C': level5.L5_2C,
    '3C': level5.L5_3C,
    '3D': level5.L5_3D,
    '4C': level4.L4_4C, // held back from Level 4, reused here -- see note above
    '4D': level5.L5_4D,
    '5A': level5.L5_5A,
    '5B': level5.L5_5B,
    '5D': level5.L5_5D,
    '6C': level5.L5_6C,
    '7A': level5.L5_7A,
    '7B': level5.L5_7B,
    '8A': level5.L5_8A,
    '8C': level5.L5_8C,
    '8D': level5.L5_8D,
    '9A': level5.L5_9A,
    '9B': level5.L5_9B,
    '9C': level5.L5_9C,
  },
  6: {
    '1B': level6.L6_1B,
    '1D': level6.L6_1D,
    '1F': level6.L6_1F,
    '1G': level6.L6_1G,
    '1H': level6.L6_1H,
    '2A': level6.L6_2A,
    '2B': level6.L6_2B,
    '2C': level6.L6_2C,
    '3C': level6.L6_3C,
    '3D': level6.L6_3D,
    '4C': level6.L6_4C,
    '4D': level6.L6_4D,
    '5A': level6.L6_5A,
    '5B': level6.L6_5B,
    // 5C marked "Redundant" -- no generator, same as Levels 4-5.
    '5D': level6.L6_5D,
    '6D': level6.L6_6D,
    '7A': level6.L6_7A,
    '7B': level6.L6_7B,
    '8A': level6.L6_8A,
    // 8B (Ratios) still never implemented, per standing instruction.
    '8C': level6.L6_8C,
    '8D': level6.L6_8D,
    // 9A marked "Redundant" at this level -- no fresh generator needed.
    '9B': level6.L6_9B,
    '9C': level6.L6_9C,
  },
}

export function generateInsightQuestion(subdomain, level, language = 'en') {
  const gen = generators[level]?.[subdomain]
  if (!gen) return null
  return gen(language)
}

// Used by domainConfig's slot selection to exclude subdomains that are
// "active" by level range but don't have a generator written yet --
// those should never be picked for a real test (no "Coming soon" cards).
export function hasGenerator(subdomain, level) {
  return !!generators[level]?.[subdomain]
}
