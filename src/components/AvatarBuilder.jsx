const CATEGORIES = [
  { label: 'Face', folder: 'faces', key: 'face' },
  { label: 'Hat', folder: 'hats', key: 'hat' },
  { label: 'Glasses', folder: 'glasses', key: 'glasses' },
  { label: 'Scarf', folder: 'scarves', key: 'scarf' },
]

// Renders only the category steppers -- the avatar preview itself is
// the caller's responsibility, so a parent screen can lay the big
// preview and these controls out however it needs (e.g. side by side).
function AvatarBuilder({ avatar, unlocked, onChange }) {
  function cycle(key, unlockedKey, direction) {
    const available = unlocked[unlockedKey]
    const idx = available.indexOf(avatar[key])
    const next = available[(idx + direction + available.length) % available.length]
    onChange({ ...avatar, [key]: next })
  }

  return (
    <div className="avatar-controls">
      {CATEGORIES.map(({ label, folder, key }) => {
        const unlockedKey = folder
        const available = unlocked[unlockedKey]
        return (
          <div key={key} className="avatar-row">
            <span className="avatar-label">{label}</span>
            <div className="avatar-stepper">
              <button
                className="avatar-arrow"
                onClick={() => cycle(key, unlockedKey, -1)}
                disabled={available.length <= 1}
              >‹</button>
              <span className="avatar-index">{String(avatar[key]).padStart(2, '0')}</span>
              <button
                className="avatar-arrow"
                onClick={() => cycle(key, unlockedKey, 1)}
                disabled={available.length <= 1}
              >›</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AvatarBuilder
