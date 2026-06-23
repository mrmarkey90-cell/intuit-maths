import { createElement, useEffect, useRef, useState } from 'react'
import { loadAvatarAsset } from '../lib/avatarAssetLoader'
import { SKIN_TONES, HAIR_COLORS } from '../lib/avatarConfig'

const CROPS = {
  bust: { aspect: 1 },
  full: { aspect: 1.5 },
}

// Face outline is ~2.7 user units (artist's "8pt" in Inkscape) --
// arms/legs at 10pt-equivalent, same ratio: 2.7 * (10/8) = 3.375.
const LIMB_STYLE = { stroke: '#000', strokeWidth: 3.4, strokeLinecap: 'round', fill: 'none' }

function renderShapes(shapes, keyPrefix, fillOverride) {
  if (!shapes) return null
  return shapes.map((shape, i) => {
    const attrs = { ...shape.attrs, key: `${keyPrefix}-${i}` }
    if (shape.isFillTarget && fillOverride) attrs.fill = fillOverride
    return createElement(shape.tag, attrs)
  })
}

// --- Two-bone IK system ---

const SHOULDERS = { left: [70, 108.5], right: [130, 108.5] }
// Equal-length bones matching the original neutral arm geometry.
const UPPER_LEN = 33.1
const LOWER_LEN = 33.1

// Solves a planar two-bone IK chain. Returns { elbow, hand } in SVG space.
// poleHint biases which of the two valid elbow positions is chosen --
// the solver picks whichever keeps the elbow closer to the hint point.
function solveIK(shoulder, target, poleHint) {
  let [tx, ty] = target
  const dx = tx - shoulder[0]
  const dy = ty - shoulder[1]
  let dist = Math.sqrt(dx * dx + dy * dy)

  // Clamp target to the chain's reachable range before solving.
  const maxReach = UPPER_LEN + LOWER_LEN - 0.01
  const minReach = Math.abs(UPPER_LEN - LOWER_LEN) + 0.01
  if (dist > maxReach || dist < minReach) {
    const clamped = Math.max(minReach, Math.min(maxReach, dist))
    if (dist > 0) { tx = shoulder[0] + dx * clamped / dist; ty = shoulder[1] + dy * clamped / dist }
    else { ty = shoulder[1] + clamped }
    dist = clamped
  }

  // Law of cosines: angle at the shoulder between upper arm and shoulder→hand.
  const cosA = (dist * dist + UPPER_LEN * UPPER_LEN - LOWER_LEN * LOWER_LEN) / (2 * dist * UPPER_LEN)
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)))
  const base = Math.atan2(ty - shoulder[1], tx - shoulder[0])

  // Two candidate elbow positions (the two IK solutions).
  const e1 = [shoulder[0] + UPPER_LEN * Math.cos(base + a), shoulder[1] + UPPER_LEN * Math.sin(base + a)]
  const e2 = [shoulder[0] + UPPER_LEN * Math.cos(base - a), shoulder[1] + UPPER_LEN * Math.sin(base - a)]

  const elbow = (() => {
    if (!poleHint) return e1
    const d1 = (e1[0] - poleHint[0]) ** 2 + (e1[1] - poleHint[1]) ** 2
    const d2 = (e2[0] - poleHint[0]) ** 2 + (e2[1] - poleHint[1]) ** 2
    return d1 <= d2 ? e1 : e2
  })()

  return { elbow, hand: [tx, ty] }
}

// Pose definitions: where we want each hand to end up, plus a pole hint
// that biases which way the elbow bends. IK solves the rest.
// Adding a new pose (attack, hit, etc.) is just a new entry -- no angle
// maths required. Any undefined pose falls back to idle in the RAF loop.
const POSE_TARGETS = {
  idle: {
    left:  { hand: [60, 174],  pole: [40, 141] },
    right: { hand: [140, 174], pole: [160, 141] },
  },
  hips: {
    left:  { hand: [84, 144],  pole: [48, 136] },
    right: { hand: [116, 144], pole: [152, 136] },
  },
  wave: {
    left:  { hand: [60, 174],  pole: [40, 141] },
    right: { hand: [148, 50],  pole: [170, 88] },
  },
  celebrate: {
    left:  { hand: [52, 50],   pole: [30, 88] },
    right: { hand: [148, 50],  pole: [170, 88] },
  },
}

// One Euler step of a damped spring in 2D. Returns [newPos, newVel].
// k = stiffness, d = damping. D=22 against D_crit≈31 gives ζ≈0.71 --
// slightly underdamped so pose transitions have a small springy overshoot
// that reads as personality rather than mechanical snap.
function springStep(pos, vel, target, k, d, dt) {
  const ax = -k * (pos[0] - target[0]) - d * vel[0]
  const ay = -k * (pos[1] - target[1]) - d * vel[1]
  const nv = [vel[0] + ax * dt, vel[1] + ay * dt]
  return [[pos[0] + nv[0] * dt, pos[1] + nv[1] * dt], nv]
}

const SPRING_K = 240
const SPRING_D = 22

// --- Auto-gesture system (unchanged) ---

// Outside the game, nobody drives the avatar's state explicitly, so it
// idles and occasionally gestures on its own. Inside the game, the game
// owns state entirely via the `state` prop -- once that prop is passed,
// this self-gesturing is disabled completely.
function useAutoState(disabled) {
  const [autoState, setAutoState] = useState('idle')

  useEffect(() => {
    if (disabled) return
    let cancelled = false
    const timeouts = []
    function after(ms, fn) {
      timeouts.push(setTimeout(() => { if (!cancelled) fn() }, ms))
    }
    function scheduleNext() {
      after(6000 + Math.random() * 6000, () => {
        const roll = Math.random()
        if (roll < 0.08) {
          setAutoState('wave')
          after(1800, () => setAutoState('idle'))
        } else if (roll < 0.30) {
          setAutoState('hips')
          after(2500, () => setAutoState('idle'))
        }
        scheduleNext()
      })
    }
    scheduleNext()
    return () => { cancelled = true; timeouts.forEach(clearTimeout) }
  }, [disabled])

  return autoState
}

// --- Component ---

function AvatarDisplay({ avatar, size = 140, crop = 'bust', state: controlledState }) {
  const [assets, setAssets] = useState({ face: null, hair: null, clothing: null, hat: null })
  // Negative delay so each instance starts mid-blink-cycle at a random point --
  // avoids every avatar on a page (e.g. class roster) blinking in sync.
  const [blinkDelay] = useState(() => -Math.random() * 4.5)
  const autoState = useAutoState(!!controlledState)
  const state = controlledState ?? autoState

  // Refs for direct SVG line mutation -- avoids 60fps React re-renders,
  // same pattern as FloatingLogos.
  const lineRefs = useRef({ leftUpper: null, leftLower: null, rightUpper: null, rightLower: null })

  // Spring simulation state lives in a ref (not React state) so the RAF
  // loop can update it without triggering re-renders. Initialised at idle
  // so there's no jump on the first frame.
  const springRef = useRef({
    left:  { pos: [60, 174],  vel: [0, 0] },
    right: { pos: [140, 174], vel: [0, 0] },
  })
  const stateRef  = useRef(state)
  const lastTsRef = useRef(null)
  const timeRef   = useRef(0)
  const rafRef    = useRef(null)

  // Keep stateRef current without restarting the RAF loop.
  useEffect(() => { stateRef.current = state }, [state])

  // Single RAF loop for the component's lifetime. Reads stateRef every
  // frame so pose changes take effect immediately without loop teardown.
  useEffect(() => {
    function tick(ts) {
      rafRef.current = requestAnimationFrame(tick)
      const dt = lastTsRef.current == null ? 0 : Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts
      timeRef.current += dt

      const pose  = stateRef.current
      const base  = POSE_TARGETS[pose] ?? POSE_TARGETS.idle
      const t     = timeRef.current

      for (const side of ['left', 'right']) {
        const shoulder = SHOULDERS[side]
        const sp = springRef.current[side]

        // Desired hand target this frame, with time-varying overlays.
        const target = [...base[side].hand]

        if (pose === 'idle') {
          // Idle sway: slightly different frequencies so the two arms
          // drift in and out of phase, matching the original CSS behaviour
          // (left at 3.2 s period, right at 3.5 s).
          target[0] += 4.5 * Math.sin(t * (side === 'right' ? 1.80 : 1.96) + (side === 'right' ? 0.8 : 0))
          target[1] += 1.5 * Math.sin(t * 1.1  + (side === 'right' ? 0.4 : 0))
        }
        if (pose === 'wave' && side === 'right') {
          // Fast wiggle on the raised hand. The spring's natural frequency
          // (ω_n≈15.5 rad/s) sits below the wiggle frequency (21 rad/s),
          // so the spring attenuates and phase-shifts the input naturally --
          // no separate filtering needed, the physics handles it.
          target[0] += 18 * Math.sin(t * 21)
        }

        const [newPos, newVel] = springStep(sp.pos, sp.vel, target, SPRING_K, SPRING_D, dt)
        sp.pos = newPos
        sp.vel = newVel

        const { elbow, hand } = solveIK(shoulder, newPos, base[side].pole)

        const upper = lineRefs.current[`${side}Upper`]
        const lower = lineRefs.current[`${side}Lower`]
        if (upper) {
          upper.setAttribute('x1', shoulder[0]); upper.setAttribute('y1', shoulder[1])
          upper.setAttribute('x2', elbow[0]);    upper.setAttribute('y2', elbow[1])
        }
        if (lower) {
          lower.setAttribute('x1', elbow[0]); lower.setAttribute('y1', elbow[1])
          lower.setAttribute('x2', hand[0]);  lower.setAttribute('y2', hand[1])
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); lastTsRef.current = null }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadAvatarAsset('faces', 0),
      loadAvatarAsset('hair', avatar.hairStyle),
      loadAvatarAsset('clothing', avatar.clothing),
      loadAvatarAsset('hats', avatar.hat),
    ]).then(([face, hair, clothing, hat]) => {
      if (!cancelled) setAssets({ face, hair, clothing, hat })
    })
    return () => { cancelled = true }
  }, [avatar.hairStyle, avatar.clothing, avatar.hat])

  const skinColor = SKIN_TONES[avatar.skinTone] ?? SKIN_TONES[0]
  const hairColor = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0]
  const { aspect } = CROPS[crop] ?? CROPS.bust
  // `size` is normally a px number (fixed-size tiles/badges), but also
  // accepts a CSS length string (e.g. a clamp()) for callers that need
  // the preview itself to scale with the viewport.
  const style = typeof size === 'string'
    ? { width: size, height: `calc(${size} * ${aspect})` }
    : { width: size, height: size * aspect }

  return (
    <svg className="avatar-display" style={style} viewBox="0 0 200 300">
      {/* Legs -- procedural. Hip pivot at y=165; legs paint before clothing
          so the shirt hem overlaps them correctly. */}
      <g {...LIMB_STYLE}>
        <line x1="70" y1="165" x2="68.125" y2="204.375" />
        <line x1="130" y1="165" x2="131.875" y2="204.375" />
      </g>

      {/* Clothing -- also serves as the torso visual, no recolouring */}
      {renderShapes(assets.clothing, 'clothing', null)}

      {/* Head -- skin tone recolouring */}
      {renderShapes(assets.face, 'face', skinColor)}

      {/* Eyebrows -- procedural, hair colour */}
      <g stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M 92 64 Q 100 59 108 62" />
        <path d="M 122 62 Q 130 59 138 64" />
      </g>

      {/* Eyes + mouth -- procedural, neutral expression. Shifted right of
          the head's centreline to sell "facing screen-right". Eyes blink
          periodically via .avatar-eyes CSS animation in App.css. */}
      <g className="avatar-eyes" fill="#1f2937" style={{ animationDelay: `${blinkDelay}s` }}>
        <circle cx="100" cy="70" r="3.5" />
        <circle cx="130" cy="70" r="3.5" />
      </g>
      <path d="M 105 95 Q 115 100 125 95" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Hair -- hair colour recolouring */}
      {renderShapes(assets.hair, 'hair', hairColor)}

      {/* Arms -- IK-driven. Four line elements mutated directly by the RAF
          loop above; painted after head/hair so a raised arm (wave/celebrate)
          draws in front of the head rather than behind it. */}
      <g {...LIMB_STYLE}>
        <line ref={el => { lineRefs.current.leftUpper  = el }} />
        <line ref={el => { lineRefs.current.leftLower  = el }} />
        <line ref={el => { lineRefs.current.rightUpper = el }} />
        <line ref={el => { lineRefs.current.rightLower = el }} />
      </g>

      {/* Hat -- topmost, no recolouring */}
      {renderShapes(assets.hat, 'hat', null)}
    </svg>
  )
}

export default AvatarDisplay
