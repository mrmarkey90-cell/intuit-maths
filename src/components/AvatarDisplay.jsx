import { createElement, useEffect, useState } from 'react'
import { loadAvatarAsset } from '../lib/avatarAssetLoader'
import { SKIN_TONES, HAIR_COLORS } from '../lib/avatarConfig'

// Square "bust" crop (head + upper body, no legs) for compact UI use
// everywhere in the maths platform today; "full" is the whole rig, for
// the future game/full-body preview. Both share the same 200-wide
// coordinate space from design/avatar-rig-guide.svg, so size scales
// consistently between them.
const CROPS = {
  bust: { viewBox: '0 0 200 200', aspect: 1 },
  full: { viewBox: '0 0 200 300', aspect: 1.5 },
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

function AvatarDisplay({ avatar, size = 140, crop = 'bust' }) {
  const [assets, setAssets] = useState({ face: null, hair: null, clothing: null, hat: null })

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
  const { viewBox, aspect } = CROPS[crop] ?? CROPS.bust

  return (
    <svg className="avatar-display" style={{ width: size, height: size * aspect }} viewBox={viewBox}>
      {/* Legs -- procedural */}
      <g {...LIMB_STYLE}>
        <line x1="70" y1="185" x2="65" y2="290" />
        <line x1="130" y1="185" x2="135" y2="290" />
      </g>

      {/* Clothing -- also visually serves as the torso, no recolouring */}
      {renderShapes(assets.clothing, 'clothing', null)}

      {/* Arms -- procedural, in front of clothing */}
      <g {...LIMB_STYLE}>
        <line x1="70" y1="108.5" x2="60" y2="174" />
        <line x1="130" y1="108.5" x2="140" y2="174" />
      </g>

      {/* Head -- skin tone recolouring */}
      {renderShapes(assets.face, 'face', skinColor)}

      {/* Eyes + mouth -- procedural, neutral expression. Shifted right
          of the head's centerline (100) rather than centered on it --
          this is what sells "facing screen-right" (see CLAUDE.md),
          the same simple-dot-eyes technique the Cyanide & Happiness
          reference uses, no body asymmetry needed. */}
      <g fill="#1f2937">
        <circle cx="100" cy="70" r="3.5" />
        <circle cx="130" cy="70" r="3.5" />
      </g>
      <path d="M 105 95 Q 115 100 125 95" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Hair -- hair colour recolouring */}
      {renderShapes(assets.hair, 'hair', hairColor)}

      {/* Hat -- topmost, no recolouring */}
      {renderShapes(assets.hat, 'hat', null)}
    </svg>
  )
}

export default AvatarDisplay
