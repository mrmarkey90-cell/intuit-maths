// Avatar v2 -- procedural body (drawn by AvatarDisplay), hand-drawn
// hair/clothing/hat assets layered on top. See design/avatar-rig-guide.svg
// for the shared coordinate system every asset is drawn against.
//
// Avatar shape stored on pupil_profiles.avatar:
//   { skinTone: 0, hairStyle: 0, hairColor: 0, clothing: 0, hat: null }
// skinTone/hairColor are indexes into the palettes below; hairStyle/
// clothing/hat are indexes into their public/avatars/{category}/ folders.
//
// Unlocked items, pupil_profiles.unlocked_items: { hats: [] } -- skin
// tone, hair (style + colour), and clothing are always fully available,
// no unlocking. Hats are the only earnable/locked item (per-pupil),
// awarded by the standalone game once it exists -- starts empty.

export const SKIN_TONES = [
  '#ffe0bd',
  '#f4c89a',
  '#e0ac69',
  '#c68642',
  '#8d5524',
  '#5c3a21',
]

export const HAIR_COLORS = [
  '#0a0a0a', // black
  '#3b2417', // dark brown
  '#6b4226', // brown
  '#a36f3d', // light brown
  '#d4a017', // blonde
  '#c1440e', // ginger
]

// Bump these as more assets are drawn -- see public/avatars/{category}/.
export const HAIR_STYLE_COUNT = 4
export const CLOTHING_COUNT = 14
export const HAT_COUNT = 0

export const DEFAULT_AVATAR = {
  skinTone: 0,
  hairStyle: 0,
  hairColor: 0,
  clothing: 0,
  hat: null,
}

export const DEFAULT_UNLOCKED = { hats: [] }

// Paint order, bottom to top. Matches design/avatar-rig-guide.svg.
export const LAYER_ORDER = ['legs', 'torso', 'clothing', 'arms', 'head', 'hair', 'hat']
