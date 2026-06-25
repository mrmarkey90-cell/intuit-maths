// Static registry — add each key here as its mission file is built.
// hasMission is the only guard needed: the hub skips any slot with no file.
const REGISTERED = new Set(['1_1A'])

export function hasMission(key) {
  return REGISTERED.has(key)
}

export async function loadMission(key) {
  const mod = await import(`./${key}.jsx`)
  return mod.default
}
