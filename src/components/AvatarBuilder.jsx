import { SKIN_TONES, HAIR_COLORS, HAIR_STYLE_COUNT, CLOTHING_COUNT } from '../lib/avatarConfig'

function SwatchRow({ colors, selected, onSelect }) {
  return (
    <div className="avatar-swatch-row">
      {colors.map((color, i) => (
        <button
          key={i}
          className={`avatar-swatch${i === selected ? ' avatar-swatch--selected' : ''}`}
          style={{ background: color }}
          onClick={() => onSelect(i)}
          aria-label={`Colour ${i + 1}`}
        />
      ))}
    </div>
  )
}

function Stepper({ label, value, count, onChange }) {
  return (
    <div className="avatar-row">
      <span className="avatar-label">{label}</span>
      <div className="avatar-stepper">
        <button className="avatar-arrow" onClick={() => onChange((value - 1 + count) % count)} disabled={count <= 1}>‹</button>
        <span className="avatar-index">{String(value).padStart(2, '0')}</span>
        <button className="avatar-arrow" onClick={() => onChange((value + 1) % count)} disabled={count <= 1}>›</button>
      </div>
    </div>
  )
}

// Renders only the controls -- the avatar preview itself is the
// caller's responsibility, so a parent screen can lay the big preview
// and these controls out however it needs (e.g. side by side).
//
// Skin tone and hair colour are palette swatches (free, no unlocking).
// Hairstyle and clothing are steppers through every drawn asset (also
// free -- clothing ships with 10 unlocked designs from the start).
// Hat is the only locked category: a stepper through "None" plus
// whatever's in unlocked.hats, or a placeholder message if nothing's
// been earned yet.
function AvatarBuilder({ avatar, unlocked, onChange }) {
  function set(key, value) {
    onChange({ ...avatar, [key]: value })
  }

  const unlockedHats = unlocked?.hats ?? []
  const hatOptions = [null, ...unlockedHats]
  const hatIndex = Math.max(0, hatOptions.indexOf(avatar.hat))

  return (
    <div className="avatar-controls">
      <div className="avatar-row avatar-row--swatches">
        <span className="avatar-label">Skin</span>
        <SwatchRow colors={SKIN_TONES} selected={avatar.skinTone} onSelect={i => set('skinTone', i)} />
      </div>

      <Stepper label="Hair" value={avatar.hairStyle} count={HAIR_STYLE_COUNT} onChange={v => set('hairStyle', v)} />

      <div className="avatar-row avatar-row--swatches">
        <span className="avatar-label">Hair colour</span>
        <SwatchRow colors={HAIR_COLORS} selected={avatar.hairColor} onSelect={i => set('hairColor', i)} />
      </div>

      <Stepper label="Clothing" value={avatar.clothing} count={CLOTHING_COUNT} onChange={v => set('clothing', v)} />

      {unlockedHats.length === 0 ? (
        <p className="avatar-hats-locked">Hats are earned in the game -- coming soon!</p>
      ) : (
        <Stepper label="Hat" value={hatIndex} count={hatOptions.length} onChange={i => set('hat', hatOptions[i])} />
      )}
    </div>
  )
}

export default AvatarBuilder
