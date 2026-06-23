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

const SHOULDERS   = { left: [70, 108.5],  right: [130, 108.5] }
const UPPER_ARM   = 33.1
const LOWER_ARM   = 33.1

// Hip pivots are at the top of each leg (bottom of the shirt hem).
const HIP_PIVOTS  = { left: [70, 165],    right: [130, 165] }
const UPPER_LEG   = 19.72
const LOWER_LEG   = 19.72

// Neutral leg stance: 99 % extension with pole hint close to the
// hip-foot line, so the knee deviates only ~8° and legs look straight.
const FOOT_STAND      = { left: [68.5, 204],  right: [131.5, 204] }
const KNEE_POLE_STAND = { left: [65,   184],  right: [135,   184] }

// Squat anticipation (floor pause before each hop): feet pulled 7 units
// up in local space while the body descends by the same SQUAT_DEPTH, so
// the feet appear to stay on the floor in world space while the knees bend.
const FOOT_SQUAT      = { left: [63, 196],  right: [137, 196] }
const KNEE_POLE_SQUAT = { left: [42, 181],  right: [158, 181] }
const SQUAT_DEPTH     = 7   // SVG units -- body descends by this during squat

// Celebrate tuck (airborne): feet pulled high and wide, knees spread.
const FOOT_TUCK      = { left: [55, 180],  right: [145, 180] }
const KNEE_POLE_TUCK = { left: [28, 163],  right: [172, 163] }

// Solves a planar two-bone IK chain. Returns { elbow, hand } in SVG space.
// upperLen/lowerLen default to arm dimensions so existing arm calls are unchanged.
function solveIK(pivot, target, poleHint, upperLen = UPPER_ARM, lowerLen = LOWER_ARM) {
  let [tx, ty] = target
  const dx = tx - pivot[0]
  const dy = ty - pivot[1]
  let dist = Math.sqrt(dx * dx + dy * dy)

  const maxReach = upperLen + lowerLen - 0.01
  const minReach = Math.abs(upperLen - lowerLen) + 0.01
  if (dist > maxReach || dist < minReach) {
    const clamped = Math.max(minReach, Math.min(maxReach, dist))
    if (dist > 0) { tx = pivot[0] + dx * clamped / dist; ty = pivot[1] + dy * clamped / dist }
    else { ty = pivot[1] + clamped }
    dist = clamped
  }

  const cosA = (dist * dist + upperLen * upperLen - lowerLen * lowerLen) / (2 * dist * upperLen)
  const a    = Math.acos(Math.max(-1, Math.min(1, cosA)))
  const base = Math.atan2(ty - pivot[1], tx - pivot[0])

  const e1 = [pivot[0] + upperLen * Math.cos(base + a), pivot[1] + upperLen * Math.sin(base + a)]
  const e2 = [pivot[0] + upperLen * Math.cos(base - a), pivot[1] + upperLen * Math.sin(base - a)]

  const elbow = (() => {
    if (!poleHint) return e1
    const d1 = (e1[0] - poleHint[0]) ** 2 + (e1[1] - poleHint[1]) ** 2
    const d2 = (e2[0] - poleHint[0]) ** 2 + (e2[1] - poleHint[1]) ** 2
    return d1 <= d2 ? e1 : e2
  })()

  return { elbow, hand: [tx, ty] }
}

// Pose definitions for arms. Any undefined pose falls back to idle.
const POSE_TARGETS = {
  idle: {
    left:  { hand: [60, 174],  pole: [40, 141] },
    right: { hand: [140, 174], pole: [160, 141] },
  },
  hips: {
    left:  { hand: [68, 165],  pole: [28, 130] },
    right: { hand: [132, 165], pole: [172, 130] },
  },
  wave: {
    left:  { hand: [60, 174],  pole: [40, 141] },
    right: { hand: [152, 55],  pole: [175, 82] },
  },
  celebrate: {
    left:  { hand: [52, 50],   pole: [30, 88] },
    right: { hand: [148, 50],  pole: [170, 88] },
  },
}

// One Euler step of a 2D damped spring. D=22 against D_crit≈31 gives
// ζ≈0.71 -- slightly underdamped for a springy pose-transition overshoot.
function springStep(pos, vel, target, k, d, dt) {
  const ax = -k * (pos[0] - target[0]) - d * vel[0]
  const ay = -k * (pos[1] - target[1]) - d * vel[1]
  const nv = [vel[0] + ax * dt, vel[1] + ay * dt]
  return [[pos[0] + nv[0] * dt, pos[1] + nv[1] * dt], nv]
}

const SPRING_K = 240
const SPRING_D = 22

// --- Celebrate jump constants ---
const JUMP_HEIGHT  = 26             // SVG units
const JUMP_FREQ    = Math.PI / 0.37 // ≈8.5 rad/s → 0.74 s period, snappier than before
const MAX_ROTATION = 10             // degrees

// Arm asynchrony: left arm lags right by ARM_PHASE_L radians.
// ARM_DRIFT is a very slow secondary oscillation (≈8 s period) that
// prevents consecutive hops feeling like a perfectly mechanical loop.
const ARM_PHASE_L = 0.6
const ARM_DRIFT_F = 0.79
const ARM_DRIFT_A = 0.10

const MOUTH_SMILE = 'M 105 95 Q 115 100 125 95'
// Bezier ellipse centred at (115,97), rx=6, ry=5 — surprised "O"
const MOUTH_O = 'M 115,92 C 118.3,92 121,94.2 121,97 C 121,99.8 118.3,102 115,102 C 111.7,102 109,99.8 109,97 C 109,94.2 111.7,92 115,92 Z'

const BROW_PATHS = {
  normal: {
    left:  'M 92 64 Q 100 59 108 62',
    right: 'M 122 62 Q 130 59 138 64',
  },
  hips: {
    left:  'M 91 60 Q 100 54 109 58',
    right: 'M 121 58 Q 130 54 139 60',
  },
}

// --- Auto-gesture system (unchanged) ---

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
  const [blinkDelay] = useState(() => -Math.random() * 4.5)
  const autoState = useAutoState(!!controlledState)
  const state = controlledState ?? autoState

  // Eight line refs (four arms, four legs) plus the body group transform.
  // All mutated directly in the RAF loop -- no 60fps React re-renders.
  const armRefs      = useRef({ leftUpper: null, leftLower: null, rightUpper: null, rightLower: null })
  const legRefs      = useRef({ leftUpper: null, leftLower: null, rightUpper: null, rightLower: null })
  const bodyGroupRef = useRef(null)
  const browRefs     = useRef({ left: null, right: null })
  const mouthRef     = useRef(null)

  const springRef = useRef({
    left:  { pos: [60, 174],  vel: [0, 0] },
    right: { pos: [140, 174], vel: [0, 0] },
  })
  const stateRef          = useRef(state)
  const prevPoseRef       = useRef(state)
  const celebrateStartRef = useRef(0)
  const lastTsRef         = useRef(null)
  const timeRef           = useRef(0)
  const rafRef            = useRef(null)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const paths = BROW_PATHS[state] ?? BROW_PATHS.normal
    browRefs.current.left?.setAttribute('d', paths.left)
    browRefs.current.right?.setAttribute('d', paths.right)
  }, [state])

  useEffect(() => {
    let cancelled = false
    const ids = []
    function after(ms, fn) { ids.push(setTimeout(() => { if (!cancelled) fn() }, ms)) }
    function scheduleO() {
      after(12000 + Math.random() * 15000, () => {
        const el = mouthRef.current
        if (el) {
          el.setAttribute('d', MOUTH_O)
          el.setAttribute('fill', '#1f2937')
          el.setAttribute('stroke', 'none')
          el.setAttribute('stroke-width', '0')
        }
        after(500 + Math.random() * 400, () => {
          const el = mouthRef.current
          if (el) {
            el.setAttribute('d', MOUTH_SMILE)
            el.setAttribute('fill', 'none')
            el.setAttribute('stroke', '#1f2937')
            el.setAttribute('stroke-width', '2.5')
          }
          scheduleO()
        })
      })
    }
    // Random initial offset so multiple avatars on one page don't sync up
    after(Math.random() * 8000, scheduleO)
    return () => { cancelled = true; ids.forEach(clearTimeout) }
  }, [])

  useEffect(() => {
    function tick(ts) {
      rafRef.current = requestAnimationFrame(tick)
      const dt = lastTsRef.current == null ? 0 : Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts
      timeRef.current += dt

      const pose = stateRef.current
      const base = POSE_TARGETS[pose] ?? POSE_TARGETS.idle
      const t    = timeRef.current

      if (pose !== prevPoseRef.current) {
        if (pose === 'celebrate') celebrateStartRef.current = t
        prevPoseRef.current = pose
      }

      // tSince: time elapsed since celebrate began (0 for all other poses).
      const tSince = pose === 'celebrate' ? t - celebrateStartRef.current : 0

      // --- Celebrate jump ---
      // rawSin = sin(tSince * JUMP_FREQ)
      //   pumpFraction  = max(0,  rawSin): 0 at floor/pause, 1 at peak
      //   squatFraction = max(0, -rawSin): 0 at landing/takeoff, 1 mid-pause
      //
      // bodyY: rises on pump (negative = up), lowers on squat (positive).
      //   SQUAT_DEPTH matches the leg offset below so the feet stay at
      //   floor level in world space while the knees bend in local space.
      //
      // rotation: 2 * pump * cos zeros at both floor and peak, leans
      //   forward mid-way up and backward mid-way down. Tiny extra lean
      //   (-3°) during the squat adds anticipation character.
      let pumpFraction  = 0
      let squatFraction = 0
      let bodyY         = 0
      let rotation      = 0
      if (pose === 'celebrate') {
        const rawSin = Math.sin(tSince * JUMP_FREQ)
        const cosVal = Math.cos(tSince * JUMP_FREQ)
        pumpFraction  = Math.max(0,  rawSin)
        squatFraction = Math.max(0, -rawSin)
        bodyY         = -JUMP_HEIGHT * pumpFraction + SQUAT_DEPTH * squatFraction
        rotation      =  2 * MAX_ROTATION * pumpFraction * cosVal - 3 * squatFraction
      }
      bodyGroupRef.current?.setAttribute('transform',
        `translate(0,${bodyY.toFixed(2)}) rotate(${rotation.toFixed(2)},100,145)`)

      // --- Leg IK ---
      // During airborne (pump > 0): lerp stand → tuck.
      // During floor pause (squat > 0): lerp stand → squat.
      // The two fractions are mutually exclusive so both terms can coexist.
      // Outside celebrate both are 0 → legs stay in the standing position.
      for (const side of ['left', 'right']) {
        const hip  = HIP_PIVOTS[side]
        const foot = [
          FOOT_STAND[side][0] + (FOOT_TUCK[side][0]  - FOOT_STAND[side][0]) * pumpFraction
                              + (FOOT_SQUAT[side][0]  - FOOT_STAND[side][0]) * squatFraction,
          FOOT_STAND[side][1] + (FOOT_TUCK[side][1]  - FOOT_STAND[side][1]) * pumpFraction
                              + (FOOT_SQUAT[side][1]  - FOOT_STAND[side][1]) * squatFraction,
        ]
        const pole = [
          KNEE_POLE_STAND[side][0] + (KNEE_POLE_TUCK[side][0]  - KNEE_POLE_STAND[side][0]) * pumpFraction
                                   + (KNEE_POLE_SQUAT[side][0] - KNEE_POLE_STAND[side][0]) * squatFraction,
          KNEE_POLE_STAND[side][1] + (KNEE_POLE_TUCK[side][1]  - KNEE_POLE_STAND[side][1]) * pumpFraction
                                   + (KNEE_POLE_SQUAT[side][1] - KNEE_POLE_STAND[side][1]) * squatFraction,
        ]
        const { elbow: knee, hand: footPos } = solveIK(hip, foot, pole, UPPER_LEG, LOWER_LEG)
        const lu = legRefs.current[`${side}Upper`]
        const ll = legRefs.current[`${side}Lower`]
        if (lu) { lu.setAttribute('x1', hip[0]);    lu.setAttribute('y1', hip[1]);    lu.setAttribute('x2', knee[0]);    lu.setAttribute('y2', knee[1]) }
        if (ll) { ll.setAttribute('x1', knee[0]);   ll.setAttribute('y1', knee[1]);   ll.setAttribute('x2', footPos[0]); ll.setAttribute('y2', footPos[1]) }
      }

      // --- Arms ---
      for (const side of ['left', 'right']) {
        const shoulder = SHOULDERS[side]
        const sp       = springRef.current[side]
        const target   = [...base[side].hand]

        if (pose === 'idle') {
          target[0] += 4.5 * Math.sin(t * (side === 'right' ? 1.80 : 1.96) + (side === 'right' ? 0.8 : 0))
          target[1] += 1.5 * Math.sin(t * 1.1  + (side === 'right' ? 0.4 : 0))
        }
        if (pose === 'wave' && side === 'right') {
          const w = Math.sin(t * 21)
          target[0] += 14 * w                   // horizontal sweep
          target[1] -= 5 * Math.abs(w)          // lifts at the extremes, arcs the path
        }
        if (pose === 'wave' && side === 'left') {
          target[0] -= 9 * Math.sin(t * 2.5)   // slow weight-shift sway
          target[1] += 4 * Math.sin(t * 1.8)
        }
        if (pose === 'celebrate') {
          // Each arm has its own phase so left and right are slightly out of
          // sync. ARM_DRIFT adds a slow secondary wobble (≈8 s period) so
          // the pattern never settles into a perfectly mechanical loop.
          const phaseOffset = side === 'left' ? ARM_PHASE_L : 0
          const drift       = ARM_DRIFT_A * Math.sin(t * ARM_DRIFT_F)
          const armPump     = Math.max(0, Math.sin(tSince * JUMP_FREQ + phaseOffset + drift))
          // Arms drop and spread between hops; thrust up and inward at peak.
          target[1] += 26 * (1 - armPump)
          target[0] += 10 * (1 - armPump) * (side === 'left' ? -1 : 1)
        }

        const [newPos, newVel] = springStep(sp.pos, sp.vel, target, SPRING_K, SPRING_D, dt)
        sp.pos = newPos
        sp.vel = newVel

        const { elbow, hand } = solveIK(shoulder, newPos, base[side].pole)
        const upper = armRefs.current[`${side}Upper`]
        const lower = armRefs.current[`${side}Lower`]
        if (upper) { upper.setAttribute('x1', shoulder[0]); upper.setAttribute('y1', shoulder[1]); upper.setAttribute('x2', elbow[0]); upper.setAttribute('y2', elbow[1]) }
        if (lower) { lower.setAttribute('x1', elbow[0]);    lower.setAttribute('y1', elbow[1]);    lower.setAttribute('x2', hand[0]);  lower.setAttribute('y2', hand[1]) }
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
  const style = typeof size === 'string'
    ? { width: size, height: `calc(${size} * ${aspect})` }
    : { width: size, height: size * aspect }

  return (
    <svg className="avatar-display" style={style} viewBox="0 0 200 300" overflow="visible">
      <g ref={bodyGroupRef}>
        {/* Legs -- IK-driven, four line elements mutated by the RAF loop.
            Neutral stance has a visible knee bend (89 % extension) so they
            look natural in all poses, not just celebrate. Painted before
            clothing so the shirt hem correctly overlaps the thighs. */}
        <g {...LIMB_STYLE}>
          <line ref={el => { legRefs.current.leftUpper  = el }} />
          <line ref={el => { legRefs.current.leftLower  = el }} />
          <line ref={el => { legRefs.current.rightUpper = el }} />
          <line ref={el => { legRefs.current.rightLower = el }} />
        </g>

        {/* Clothing -- also serves as the torso visual, no recolouring */}
        {renderShapes(assets.clothing, 'clothing', null)}

        {/* Head -- skin tone recolouring */}
        {renderShapes(assets.face, 'face', skinColor)}

        {/* Eyebrows -- procedural, hair colour. Path swapped to furrowed during hips pose. */}
        <g stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round">
          <path ref={el => { browRefs.current.left  = el }} d={BROW_PATHS.normal.left}  />
          <path ref={el => { browRefs.current.right = el }} d={BROW_PATHS.normal.right} />
        </g>

        {/* Eyes + mouth -- procedural. Eyes blink via .avatar-eyes in App.css. */}
        <g className="avatar-eyes" fill="#1f2937" style={{ animationDelay: `${blinkDelay}s` }}>
          <circle cx="100" cy="70" r="3.5" />
          <circle cx="130" cy="70" r="3.5" />
        </g>
        <path ref={mouthRef} d={MOUTH_SMILE} stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Hair -- hair colour recolouring */}
        {renderShapes(assets.hair, 'hair', hairColor)}

        {/* Arms -- IK-driven, painted after head/hair so raised arms
            appear in front of the head on wave/celebrate. */}
        <g {...LIMB_STYLE}>
          <line ref={el => { armRefs.current.leftUpper  = el }} />
          <line ref={el => { armRefs.current.leftLower  = el }} />
          <line ref={el => { armRefs.current.rightUpper = el }} />
          <line ref={el => { armRefs.current.rightLower = el }} />
        </g>

        {/* Hat -- topmost, no recolouring */}
        {renderShapes(assets.hat, 'hat', null)}
      </g>
    </svg>
  )
}

export default AvatarDisplay
