// Static registry — add each key here as its mission file is built.
// hasMission is the only guard needed: the hub skips any slot with no file.
const REGISTERED = new Set(['1_1A', '2_1A', '3_1A', '4_1A', '2_1B', '3_1B', '4_1B', '5_1B'])

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
