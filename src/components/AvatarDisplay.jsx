import { createElement, useEffect, useState } from 'react'
import { loadAvatarAsset } from '../lib/avatarAssetLoader'
import { SKIN_TONES, HAIR_COLORS } from '../lib/avatarConfig'

// Both modes render the same full-body viewBox -- "bust" just asks for
// a square container, so the whole figure scales down to fit (letterboxed
// left/right) rather than being cropped at the legs. "full" asks for a
// 2:3 container that fits the figure edge to edge. Used for compact UI
// (bust, everywhere in the maths platform today) vs a future full-body
// game/preview context (full).
const CROPS = {
  bust: { aspect: 1 },
  full: { aspect: 1.5 },
}

// Face outline is ~2.7 user units (the artist's "8pt" in Inkscape) --
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

// Two-bone arm (shoulder + elbow), drawn at neutral hanging coordinates
// and posed by rotating around the shoulder/elbow pivots. Rotation is
// computed directly in JS into absolute x/y coordinates, NOT done via
// nested CSS transform-origin -- that looked right for small angles
// (idle sway, a few degrees) but silently failed to visibly rotate at
// all for larger angles (hips' ~110deg elbow fold, wave's -150deg
// shoulder raise), even though the computed angle values going into
// the style were confirmed correct. Root cause not fully pinned down;
// computing real coordinates sidesteps it entirely and is easy to
// verify (the numbers are just the line's actual endpoints).
const ARM_GEOMETRY = {
  left: { shoulder: [70, 108.5], elbow: [65, 141.25], hand: [60, 174] },
  right: { shoulder: [130, 108.5], elbow: [135, 141.25], hand: [140, 174] },
}

function rotateAround([px, py], [cx, cy], angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

// Rotation degrees, [shoulder, elbow] -- elbow angle is additional
// rotation on top of the shoulder's, not an absolute angle. Hips: the
// shoulder swings the upper arm outward, the elbow folds sharply back
// the other way so the hand lands at the waist with the elbow pointing
// out. Wave: only the right arm raises; a separate wiggle animation
// (see AvatarDisplay) layers the actual side-to-side waving motion on
// top of this held raised angle. Celebrate: both arms raised, mirrors
// of wave's raised right arm.
//
// This is deliberately a plain lookup table, not a hardcoded switch --
// new states the future game needs (attack, hit, etc.) are just new
// entries here. Any state not yet defined here falls back to idle
// rather than crashing (see Arm below), since the game's state names
// will exist before their avatar poses are designed.
const POSE_ANGLES = {
  idle: { left: [0, 0], right: [0, 0] },
  hips: { left: [25, -110], right: [-25, 110] },
  wave: { left: [0, 0], right: [-150, -20] },
  celebrate: { left: [150, 20], right: [-150, -20] },
}

const COORD_TRANSITION = { transition: 'x1 0.6s ease, y1 0.6s ease, x2 0.6s ease, y2 0.6s ease' }

function Arm({ side, pose }) {
  const { shoulder, elbow: elbowNeutral, hand: handNeutral } = ARM_GEOMETRY[side]
  const [shoulderAngle, elbowAngle] = (POSE_ANGLES[pose] ?? POSE_ANGLES.idle)[side]
  const isIdle = pose === 'idle'
  const isWavingArm = pose === 'wave' && side === 'right'

  // Rotate the elbow around the shoulder, then rotate the hand around
  // the shoulder too (carrying it along with the upper arm) before
  // applying the elbow's own additional rotation around its new
  // (already-rotated) position -- a real two-bone chain.
  const elbow = rotateAround(elbowNeutral, shoulder, shoulderAngle)
  const hand = rotateAround(rotateAround(handNeutral, shoulder, shoulderAngle), elbow, elbowAngle)

  return (
    <g
      className={isIdle ? `avatar-arm-sway avatar-arm-sway--${side}` : ''}
      style={isIdle ? { transformBox: 'view-box', transformOrigin: `${shoulder[0]}px ${shoulder[1]}px` } : undefined}
    >
      <line x1={shoulder[0]} y1={shoulder[1]} x2={elbow[0]} y2={elbow[1]} style={COORD_TRANSITION} {...LIMB_STYLE} />
      <g
        className={isWavingArm ? 'avatar-wave-wiggle' : ''}
        style={{ transformBox: 'view-box', transformOrigin: `${elbow[0]}px ${elbow[1]}px` }}
      >
        <line x1={elbow[0]} y1={elbow[1]} x2={hand[0]} y2={hand[1]} style={COORD_TRANSITION} {...LIMB_STYLE} />
      </g>
    </g>
  )
}

// Outside the game (every screen in the maths platform today), nobody
// drives the avatar's state explicitly, so it idles and occasionally
// gestures on its own. Inside the game, the game owns state entirely
// (idle/attack/hit/celebrate/...) via the `state` prop -- once that
// prop is passed, this self-gesturing is disabled completely, since
// random hand-on-hips moments mid-combat would fight with gameplay.
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
        if (roll < 0.08) { // rare cheeky wave
          setAutoState('wave')
          after(1800, () => setAutoState('idle'))
        } else if (roll < 0.30) { // occasional hands on hips
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

function AvatarDisplay({ avatar, size = 140, crop = 'bust', state: controlledState }) {
  const [assets, setAssets] = useState({ face: null, hair: null, clothing: null, hat: null })
  // Negative delay so each instance starts mid-cycle at a random point --
  // avoids every avatar on a page (e.g. a class roster) blinking in sync.
  // Computed once per mount, not on every avatar change.
  const [blinkDelay] = useState(() => -Math.random() * 4.5)
  const autoState = useAutoState(!!controlledState)
  const state = controlledState ?? autoState

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

  return (
    <svg className="avatar-display" style={{ width: size, height: size * aspect }} viewBox="0 0 200 300">
      {/* Legs -- procedural, now 37.5% of the original hip-to-floor
          length (75% then another 50% off that) -- hip pivot at
          y=185 stays fixed, original foot y=290 */}
      <g {...LIMB_STYLE}>
        <line x1="70" y1="185" x2="68.125" y2="224.375" />
        <line x1="130" y1="185" x2="131.875" y2="224.375" />
      </g>

      {/* Clothing -- also visually serves as the torso, no recolouring */}
      {renderShapes(assets.clothing, 'clothing', null)}

      {/* Head -- skin tone recolouring */}
      {renderShapes(assets.face, 'face', skinColor)}

      {/* Eyebrows -- procedural, hair colour, mirrors the eyes' rightward shift */}
      <g stroke={hairColor} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M 92 64 Q 100 59 108 62" />
        <path d="M 122 62 Q 130 59 138 64" />
      </g>

      {/* Eyes + mouth -- procedural, neutral expression. Shifted right
          of the head's centerline (100) rather than centered on it --
          this is what sells "facing screen-right" (see CLAUDE.md),
          the same simple-dot-eyes technique the Cyanide & Happiness
          reference uses, no body asymmetry needed. Eyes blink
          periodically via a CSS animation (.avatar-eyes, App.css). */}
      <g className="avatar-eyes" fill="#1f2937" style={{ animationDelay: `${blinkDelay}s` }}>
        <circle cx="100" cy="70" r="3.5" />
        <circle cx="130" cy="70" r="3.5" />
      </g>
      <path d="M 105 95 Q 115 100 125 95" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Hair -- hair colour recolouring */}
      {renderShapes(assets.hair, 'hair', hairColor)}

      {/* Arms -- procedural. Painted after the head/hair, not just after
          clothing -- idle/hips keep the arms at torso height where this
          makes no visible difference, but wave/celebrate raise an arm
          up past the head, and it needs to draw in front of the head to
          be visible at all (this was a real bug: the raised arm was
          rendering, just invisible, hidden behind the head shape). Idle
          sway by default; occasional random gestures unless `state` is
          externally driven (see useAutoState above). */}
      <Arm side="left" pose={state} />
      <Arm side="right" pose={state} />

      {/* Hat -- topmost, no recolouring */}
      {renderShapes(assets.hat, 'hat', null)}
    </svg>
  )
}

export default AvatarDisplay
