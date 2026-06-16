export const DOMAIN_CONFIG = {
  // Stage 1 — Early PS1
  counting_quantity:        { label: 'Counting',              moduleType: 'numpad',          stage: 1 },
  comparing_numbers:        { label: 'Comparing Numbers',     moduleType: 'multiple_choice', stage: 1 },
  simple_addition:          { label: 'Addition',              moduleType: 'numpad',          stage: 1 },
  simple_subtraction:       { label: 'Subtraction',           moduleType: 'numpad',          stage: 1 },
  // Stage 2 — Late PS1
  addition_20:              { label: 'Addition (to 20)',       moduleType: 'numpad',          stage: 2 },
  subtraction_20:           { label: 'Subtraction (to 20)',    moduleType: 'numpad',          stage: 2 },
  doubling_halving_simple:  { label: 'Doubling & Halving',    moduleType: 'numpad',          stage: 2 },
  number_ordering:          { label: 'Number Ordering',       moduleType: 'ordering',        stage: 2 },
  // Stage 3 — Early PS2
  place_value_partitioning: { label: 'Place Value',           moduleType: 'partitioning',    stage: 3 },
  addition_2digit:          { label: '2-Digit Addition',      moduleType: 'numpad',          stage: 3 },
  subtraction_2digit:       { label: '2-Digit Subtraction',   moduleType: 'numpad',          stage: 3 },
  multiplication_2510:      { label: 'Times Tables (2,5,10)', moduleType: 'numpad',          stage: 3 },
  division_2510:            { label: 'Division (2,5,10)',     moduleType: 'numpad',          stage: 3 },
  simple_fractions:         { label: 'Simple Fractions',      moduleType: 'multiple_choice', stage: 3 },
  missing_number_simple:    { label: 'Missing Number',        moduleType: 'numpad',          stage: 3 },
  mental_estimation:        { label: 'Estimation',            moduleType: 'multiple_choice', stage: 3 },
  // Stage 4 — Late PS2
  place_value_large:        { label: 'Place Value (Large)',   moduleType: 'number_line',     stage: 4 },
  addition_3digit:          { label: '3-Digit Addition',      moduleType: 'numpad',          stage: 4 },
  subtraction_3digit:       { label: '3-Digit Subtraction',   moduleType: 'numpad',          stage: 4 },
  multiplication_all:       { label: 'Times Tables',          moduleType: 'numpad',          stage: 4 },
  division_all:             { label: 'Division',              moduleType: 'numpad',          stage: 4 },
  doubling_halving_large:   { label: 'Doubling & Halving',    moduleType: 'numpad',          stage: 4 },
  fractions_of_amount:      { label: 'Fractions of Amount',   moduleType: 'numpad',          stage: 4 },
  missing_number_complex:   { label: 'Missing Number',        moduleType: 'numpad',          stage: 4 },
  // Stage 5 — Early PS3
  large_number_arithmetic:  { label: 'Large Numbers',         moduleType: 'numpad',          stage: 5 },
  negative_numbers:         { label: 'Negative Numbers',      moduleType: 'number_line',     stage: 5 },
  decimal_operations:       { label: 'Decimal Operations',    moduleType: 'numpad',          stage: 5 },
  fraction_operations:      { label: 'Fraction Operations',   moduleType: 'multiple_choice', stage: 5 },
  powers_of_10:             { label: 'Powers of 10',          moduleType: 'numpad',          stage: 5 },
  percentage_simple:        { label: 'Percentages',           moduleType: 'numpad',          stage: 5 },
  ratio_proportion_simple:  { label: 'Ratio & Proportion',    moduleType: 'numpad',          stage: 5 },
  // Stage 6 — Late PS3
  fdp_equivalence:          { label: 'FDP Equivalence',       moduleType: 'multiple_choice', stage: 6 },
  percentage_complex:       { label: 'Complex Percentages',   moduleType: 'numpad',          stage: 6 },
  multi_step:               { label: 'Multi-Step',            moduleType: 'numpad',          stage: 6 },
  negative_operations:      { label: 'Negatives',             moduleType: 'numpad',          stage: 6 },
  decimal_mult_div:         { label: 'Decimal ×÷',            moduleType: 'numpad',          stage: 6 },
  large_number_mult_div:    { label: 'Large Number ×÷',       moduleType: 'numpad',          stage: 6 },
  ratio_proportion_complex: { label: 'Ratio & Proportion',    moduleType: 'numpad',          stage: 6 },
}

export const DOMAINS_BY_STAGE = {
  1: ['counting_quantity', 'comparing_numbers', 'simple_addition', 'simple_subtraction'],
  2: ['addition_20', 'subtraction_20', 'doubling_halving_simple', 'number_ordering'],
  3: ['place_value_partitioning', 'addition_2digit', 'subtraction_2digit', 'multiplication_2510', 'division_2510', 'simple_fractions', 'missing_number_simple', 'mental_estimation'],
  4: ['place_value_large', 'addition_3digit', 'subtraction_3digit', 'multiplication_all', 'division_all', 'doubling_halving_large', 'fractions_of_amount', 'missing_number_complex'],
  5: ['large_number_arithmetic', 'negative_numbers', 'decimal_operations', 'fraction_operations', 'powers_of_10', 'percentage_simple', 'ratio_proportion_simple'],
  6: ['fdp_equivalence', 'percentage_complex', 'multi_step', 'negative_operations', 'decimal_mult_div', 'large_number_mult_div', 'ratio_proportion_complex'],
}

// Build 9 module slots for a stage: one per domain, repeats fill to 9
export function generateModuleSlots(stage) {
  const domains = DOMAINS_BY_STAGE[stage] ?? DOMAINS_BY_STAGE[1]
  const slots = [...domains]
  while (slots.length < 9) {
    slots.push(domains[Math.floor(Math.random() * domains.length)])
  }
  return slots
}
