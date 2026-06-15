const LAYERS = [
  { folder: 'faces', key: 'face' },
  { folder: 'hats', key: 'hat' },
  { folder: 'glasses', key: 'glasses' },
  { folder: 'scarves', key: 'scarf' },
]

function AvatarDisplay({ avatar, size = 200 }) {
  const fmt = n => String(n).padStart(2, '0')
  return (
    <div className="avatar-display" style={{ width: size, height: size }}>
      {LAYERS.map(({ folder, key }) => (
        <img
          key={folder}
          src={`/avatars/${folder}/${fmt(avatar[key])}.svg`}
          className="avatar-layer"
          alt=""
          onError={e => { e.target.style.display = 'none' }}
        />
      ))}
    </div>
  )
}

export default AvatarDisplay
