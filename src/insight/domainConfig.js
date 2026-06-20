// Curriculum source: "intuit question examples" Google Sheet
// 9 domains, 36 subdomains, each active across a contiguous level range (1-6)

import { hasGenerator } from './generators/index'

export const SUBDOMAIN_CONFIG = {
  '1A': { domain: 1, domainName: 'Number System', label: 'Counting',             minLevel: 1, maxLevel: 4 },
  '1B': { domain: 1, domainName: 'Number System', label: 'Partitioning',         minLevel: 2, maxLevel: 5 },
  '1C': { domain: 1, domainName: 'Number System', label: 'Decimals',             minLevel: 4, maxLevel: 5 },
  '1D': { domain: 1, domainName: 'Number System', label: 'Negatives',            minLevel: 5, maxLevel: 6 },
  '1E': { domain: 1, domainName: 'Number System', label: 'Even / Odd',           minLevel: 2, maxLevel: 4 },
  '1F': { domain: 1, domainName: 'Number System', label: 'Multiples',            minLevel: 3, maxLevel: 6 },
  '1G': { domain: 1, domainName: 'Number System', label: 'Factors',              minLevel: 4, maxLevel: 6 },
  '1H': { domain: 1, domainName: 'Number System', label: 'Primes',               minLevel: 5, maxLevel: 6 },

  '2A': { domain: 2, domainName: 'Ordering',       label: 'Sequencing',          minLevel: 1, maxLevel: 6 },
  '2B': { domain: 2, domainName: 'Ordering',       label: 'Comparing',           minLevel: 1, maxLevel: 6 },
  '2C': { domain: 2, domainName: 'Ordering',       label: 'Rounding',            minLevel: 2, maxLevel: 6 },

  '3A': { domain: 3, domainName: 'Addition',       label: 'Bonds to 10',         minLevel: 1, maxLevel: 2 },
  '3B': { domain: 3, domainName: 'Addition',       label: 'Bridging 10',         minLevel: 2, maxLevel: 3 },
  '3C': { domain: 3, domainName: 'Addition',       label: 'Column Addition',     minLevel: 3, maxLevel: 6 },
  '3D': { domain: 3, domainName: 'Addition',       label: 'Column w/ Decimals',  minLevel: 5, maxLevel: 6 },

  '4A': { domain: 4, domainName: 'Subtraction',    label: 'Counting On',         minLevel: 1, maxLevel: 3 },
  '4B': { domain: 4, domainName: 'Subtraction',    label: 'Column Subtraction',  minLevel: 3, maxLevel: 4 },
  '4C': { domain: 4, domainName: 'Subtraction',    label: 'Column w/ Borrowing', minLevel: 5, maxLevel: 6 },
  '4D': { domain: 4, domainName: 'Subtraction',    label: 'Decimals',            minLevel: 5, maxLevel: 6 },

  '5A': { domain: 5, domainName: 'Multiplication', label: 'Times Tables',        minLevel: 2, maxLevel: 6 },
  '5B': { domain: 5, domainName: 'Multiplication', label: 'Larger Numbers',      minLevel: 4, maxLevel: 6 },
  '5C': { domain: 5, domainName: 'Multiplication', label: 'By Partition',        minLevel: 4, maxLevel: 6 },
  '5D': { domain: 5, domainName: 'Multiplication', label: 'Decimals',            minLevel: 5, maxLevel: 6 },

  '6A': { domain: 6, domainName: 'Division',       label: 'Sharing',             minLevel: 1, maxLevel: 3 },
  '6B': { domain: 6, domainName: 'Division',       label: 'Grouping',            minLevel: 2, maxLevel: 4 },
  '6C': { domain: 6, domainName: 'Division',       label: 'Multiple Digits',     minLevel: 4, maxLevel: 5 },
  '6D': { domain: 6, domainName: 'Division',       label: 'Decimals',            minLevel: 6, maxLevel: 6 },

  '7A': { domain: 7, domainName: 'Doubling & Halving', label: 'Doubling',        minLevel: 1, maxLevel: 6 },
  '7B': { domain: 7, domainName: 'Doubling & Halving', label: 'Halving',         minLevel: 1, maxLevel: 6 },

  '8A': { domain: 8, domainName: 'Proportionality', label: 'Fractions',         minLevel: 2, maxLevel: 6 },
  '8B': { domain: 8, domainName: 'Proportionality', label: 'Ratios',            minLevel: 4, maxLevel: 6 },
  '8C': { domain: 8, domainName: 'Proportionality', label: 'Percentages',       minLevel: 4, maxLevel: 6 },
  '8D': { domain: 8, domainName: 'Proportionality', label: 'Conversions',       minLevel: 5, maxLevel: 6 },

  '9A': { domain: 9, domainName: 'Problem Solving', label: 'Missing Numbers',    minLevel: 1, maxLevel: 6 },
  '9B': { domain: 9, domainName: 'Problem Solving', label: 'Multi-Step Problems',minLevel: 3, maxLevel: 6 },
  '9C': { domain: 9, domainName: 'Problem Solving', label: 'Patterns',           minLevel: 1, maxLevel: 6 },
}

export const MODULES_PER_TEST = 12

// One accent colour per top-level domain, used on module card labels
export const DOMAIN_COLORS = {
  1: '#4f46e5', // Number System — indigo
  2: '#7c3aed', // Ordering — violet
  3: '#0ea5e9', // Addition — sky
  4: '#06b6d4', // Subtraction — cyan
  5: '#f59e0b', // Multiplication — amber
  6: '#f97316', // Division — orange
  7: '#ec4899', // Doubling & Halving — pink
  8: '#14b8a6', // Proportionality — teal
  9: '#c026d3', // Problem Solving — fuchsia
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function deficitFor(code, deficits = {}) {
  const raw = deficits?.[code]
  return typeof raw === 'number' && !Number.isNaN(raw) ? Math.max(0, raw) : 0
}

// "Active by level range" isn't enough on its own -- a subdomain only
// counts if it actually has a generator written for this level, so an
// unbuilt or deliberately-skipped-at-this-level subdomain (e.g. 8B,
// which is never implemented) never gets selected and shown as a
// "Coming soon" placeholder.
export function getActiveSubdomains(level) {
  return Object.entries(SUBDOMAIN_CONFIG)
    .filter(([code, cfg]) => level >= cfg.minLevel && level <= cfg.maxLevel && hasGenerator(code, level))
    .map(([code]) => code)
}

const PRIORITY_SLOTS = 9
const RANDOM_SLOTS = MODULES_PER_TEST - PRIORITY_SLOTS

// 9 slots go to the subdomains the pupil is weakest in (lowest score / highest
// deficit); the remaining 3 are genuinely random from whatever's left, so a
// test isn't *only* ever the same known weak spots. Shuffling before the sort
// means subdomains tied on deficit -- e.g. every subdomain at 0 the moment a
// pupil starts a fresh level -- still vary test-to-test rather than always
// landing in object-insertion order.
export function generateModuleSlots(level, deficits = {}) {
  const active = getActiveSubdomains(level)
  if (active.length === 0) return []

  const byDeficitDesc = shuffle(active).sort((a, b) => deficitFor(b, deficits) - deficitFor(a, deficits))

  const priority = byDeficitDesc.slice(0, PRIORITY_SLOTS)
  const used = new Set(priority)

  const randomPool = shuffle(active.filter(code => !used.has(code)))
  const random = randomPool.slice(0, RANDOM_SLOTS)
  for (const code of random) used.add(code)

  const slots = [...priority, ...random]

  // Active pool smaller than a full test (only happens at Level 1, with 10
  // subdomains) -- pad with the weakest subdomains, cycling through them
  // rather than repeating a single one over and over.
  let i = 0
  while (slots.length < MODULES_PER_TEST) {
    slots.push(byDeficitDesc[i % byDeficitDesc.length])
    i += 1
  }

  return shuffle(slots)
}
