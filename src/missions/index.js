// Static registry — add each key here as its mission file is built.
// hasMission is the only guard needed: the hub skips any slot with no file.
const REGISTERED = new Set(['1_1A', '2_1A', '3_1A', '4_1A', '2_1B', '3_1B', '4_1B', '5_1B', '6_1B', '4_1C', '5_1C', '2_1E', '3_1E', '4_1E', '3_1F', '4_1F', '5_1F', '6_1F', '5_1D', '6_1D', '4_1G', '5_1G', '6_1G', '5_1H', '6_1H', '1_2A', '2_2A', '3_2A', '4_2A', '5_2A', '6_2A', '1_2B', '2_2B', '3_2B', '4_2B', '5_2B', '6_2B', '2_2C', '3_2C', '4_2C', '5_2C', '6_2C', '1_3A', '2_3A', '2_3B', '3_3B'])

export function hasMission(key) {
  return REGISTERED.has(key)
}

export function listMissions() {
  return [...REGISTERED].sort()
}

export async function loadMission(key) {
  const mod = await import(`./${key}.jsx`)
  return mod.default
}
