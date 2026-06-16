import * as stage1 from './stage1'

const generators = {
  counting_quantity:  stage1.counting_quantity,
  simple_addition:    stage1.simple_addition,
  simple_subtraction: stage1.simple_subtraction,
  // More domains added here as each module type is built
}

export function generateInsightQuestion(domain) {
  const gen = generators[domain]
  if (!gen) return null
  return gen()
}
