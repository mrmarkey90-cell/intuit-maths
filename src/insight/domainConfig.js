// Curriculum source: "intuit question examples" Google Sheet
// 9 domains, 36 subdomains, each active across a contiguous level range (1-6)

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
  '4B': { domain: 4, domainName: 'Subtraction',    label: 'Column Subtraction',  minLevel: 3, maxLevel: 6 },
  '4C': { domain: 4, domainName: 'Subtraction',    label: 'Column w/ Borrowing', minLevel: 5, maxLevel: 6 },
  '4D': { domain: 4, domainName: 'Subtraction',    label: 'Decimals',            minLevel: 5, maxLevel: 6 },

  '5A': { domain: 5, domainName: 'Multiplication', label: 'Times Tables',        minLevel: 2, maxLevel: 6 },
  '5B': { domain: 5, domainName: 'Multiplication', label: 'Larger Numbers',      minLevel: 4, maxLevel: 6 },
  '5C': { domain: 5, domainName: 'Multiplication', label: 'By Partition',        minLevel: 4, maxLevel: 6 },
  '5D': { domain: 5, domainName: 'Multiplication', label: 'Decimals',            minLevel: 5, maxLevel: 6 },

  '6A': { domain: 6, domainName: 'Division',       label: 'Sharing',             minLevel: 1, maxLevel: 3 },
  '6B': { domain: 6, domainName: 'Division',       label: 'Grouping',            minLevel: 2, maxLevel: 4 },
  '6C': { domain: 6, domainName: 'Division',       label: 'Multiple Digits',     minLevel: 4, maxLevel: 6 },
  '6D': { domain: 6, domainName: 'Division',       label: 'Decimals',            minLevel: 5, maxLevel: 6 },

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

export function getActiveSubdomains(level) {
  return Object.entries(SUBDOMAIN_CONFIG)
    .filter(([, cfg]) => level >= cfg.minLevel && level <= cfg.maxLevel)
    .map(([code]) => code)
}

// One subdomain per domain that has content at this level (random if a domain
// has several active subdomains), then fill to 12 — preferring subdomains not
// already in the grid before allowing any repeats (repeats are unavoidable
// once the active pool is smaller than 12, e.g. only 10 subdomains at Level 1).
export function generateModuleSlots(level) {
  const active = getActiveSubdomains(level)
  const byDomain = {}
  for (const code of active) {
    const d = SUBDOMAIN_CONFIG[code].domain
    ;(byDomain[d] ??= []).push(code)
  }

  const slots = Object.values(byDomain).map(
    codes => codes[Math.floor(Math.random() * codes.length)]
  )
  const used = new Set(slots)

  while (slots.length < MODULES_PER_TEST) {
    const unused = active.filter(c => !used.has(c))
    const pick = unused.length > 0
      ? unused[Math.floor(Math.random() * unused.length)]
      : active[Math.floor(Math.random() * active.length)]
    slots.push(pick)
    used.add(pick)
  }
  return shuffle(slots)
}
