// Static registry — add each key here as its mission file is built.
// hasMission is the only guard needed: the hub skips any slot with no file.
const REGISTERED = new Set(['1_1A', '2_1A', '3_1A', '4_1A', '2_1B', '3_1B', '4_1B', '5_1B', '6_1B', '4_1C', '5_1C', '2_1E', '3_1E', '4_1E', '5_1D', '6_1D'])

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
