import { useState } from 'react'
import AvatarDisplay from '../components/AvatarDisplay'
import AvatarBuilder from '../components/AvatarBuilder'
import { DEFAULT_AVATAR, HAT_COUNT, HAIR_STYLE_COUNT, CLOTHING_COUNT, SKIN_TONES, HAIR_COLORS } from '../lib/avatarConfig'

function randomAvatar() {
  return {
    skinTone: Math.floor(Math.random() * SKIN_TONES.length),
    hairStyle: Math.floor(Math.random() * HAIR_STYLE_COUNT),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    clothing: Math.floor(Math.random() * CLOTHING_COUNT),
    hat: null,
  }
}

const POSES = ['auto', 'idle', 'hips', 'wave', 'celebrate']

function AvatarTest() {
  const [avatar, setAvatar] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const hairStyle = params.get('hairStyle')
    const clothing = params.get('clothing')
    return {
      ...DEFAULT_AVATAR,
      ...(hairStyle != null ? { hairStyle: Number(hairStyle) } : {}),
      ...(clothing != null ? { clothing: Number(clothing) } : {}),
    }
  })
  const [hatsUnlocked, setHatsUnlocked] = useState(false)
  const [gallery, setGallery] = useState(() => Array.from({ length: 6 }, randomAvatar))
  const [pose, setPose] = useState(() => new URLSearchParams(window.location.search).get('pose') ?? 'auto')

  // Simulated unlocked hats, since HAT_COUNT is currently 0 (no hat
  // assets drawn yet) -- lets you preview the picker's unlocked state
  // ahead of any real hat files existing.
  const unlocked = { hats: hatsUnlocked ? Array.from({ length: HAT_COUNT || 3 }, (_, i) => i) : [] }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Avatar Test (dev only)</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
        Builds/previews the v2 avatar system -- never linked from any real pupil-facing screen.
      </p>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: 14, fontWeight: 600, marginRight: 8 }}>State:</span>
        {POSES.map(p => (
          <button
            key={p}
            className="button-secondary"
            style={{ marginRight: 6, fontWeight: pose === p ? 700 : 400 }}
            onClick={() => setPose(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <AvatarDisplay avatar={avatar} size={160} crop="bust" state={pose === 'auto' ? undefined : pose} />
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>bust crop (real UI usage)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <AvatarDisplay avatar={avatar} size={160} crop="full" state={pose === 'auto' ? undefined : pose} />
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>full crop (future game)</p>
          </div>
        </div>

        <div style={{ width: 280 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hatsUnlocked}
              onChange={e => setHatsUnlocked(e.target.checked)}
            />
            Simulate hats unlocked
          </label>
          <AvatarBuilder avatar={avatar} unlocked={unlocked} onChange={setAvatar} />
        </div>
      </div>

      <pre style={{
        marginTop: '1.5rem', background: '#f5f5f5', borderRadius: 8, padding: '12px 16px',
        fontSize: 13, maxWidth: 400, margin: '1.5rem auto 0', overflowX: 'auto',
      }}>
        {JSON.stringify(avatar, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Multi-avatar gallery</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '1rem', fontSize: 14 }}>
        Six random avatars rendered at once -- checks that asset ids (every Inkscape export
        reuses "fill") don't collide once several avatars share a page, e.g. a class roster.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {gallery.map((a, i) => (
          <AvatarDisplay key={i} avatar={a} size={90} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button className="button-secondary" onClick={() => setGallery(Array.from({ length: 6 }, randomAvatar))}>
          Reroll gallery
        </button>
      </div>
    </div>
  )
}

export default AvatarTest
