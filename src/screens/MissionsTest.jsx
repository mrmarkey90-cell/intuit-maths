import { useState } from 'react'
import { listMissions, loadMission } from '../missions/index'
import { useTranslation } from '../i18n/LanguageContext'

// Dev harness for testing special missions at /missions-test.
// Launches any registered mission in a simulated pupil-viewport environment.
// Pupil ID is optional -- without one, complete_mission is a no-op (no credits),
// which is fine for testing the flow itself.

const MISSIONS = listMissions()

const selectStyle = {
  padding: '7px 10px', borderRadius: 7, border: '1.5px solid #d1d5db',
  fontSize: 15, background: '#fff', minWidth: 180,
}

const inputStyle = {
  padding: '7px 10px', borderRadius: 7, border: '1.5px solid #d1d5db',
  fontSize: 14, width: '100%', maxWidth: 360, fontFamily: 'monospace',
}

export default function MissionsTest() {
  const { language, setLanguage } = useTranslation()
  const [selectedKey, setSelectedKey] = useState(MISSIONS[0] ?? '')
  const [pupilId, setPupilId] = useState('')
  const [MissionComp, setMissionComp] = useState(null)
  const [lastResult, setLastResult] = useState(null) // 'completed'
  const [loading, setLoading] = useState(false)

  async function launch() {
    if (!selectedKey || loading) return
    setLoading(true)
    try {
      const Comp = await loadMission(selectedKey)
      setMissionComp(() => Comp)
      setLastResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleComplete() {
    setMissionComp(null)
    setLastResult('completed')
  }

  // When running, take over the full screen in a pupil-viewport so all
  // mission CSS (height: 100%, font, overflow) works exactly as on device.
  if (MissionComp) {
    return (
      <div
        className="pupil-viewport"
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      >
        <MissionComp
          pupilId={pupilId.trim() || null}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Mission Test Harness</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {['en', 'cy'].map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: '3px 10px', borderRadius: 6, border: '1.5px solid',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                borderColor: language === lang ? '#4f46e5' : '#d1d5db',
                background: language === lang ? '#eef2ff' : '#fff',
                color: language === lang ? '#4f46e5' : '#6b7280',
              }}
            >
              {lang === 'en' ? 'EN' : 'CY'}
            </button>
          ))}
        </div>
      </div>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.75rem' }}>
        Runs any registered mission in a full-screen simulated pupil environment.
      </p>

      {lastResult === 'completed' && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 8, padding: '10px 14px', marginBottom: '1.5rem', color: '#15803d', fontWeight: 700, fontSize: 15 }}>
          ✓ Mission completed!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 5 }}>Mission</label>
          <select
            value={selectedKey}
            onChange={e => setSelectedKey(e.target.value)}
            style={selectStyle}
          >
            {MISSIONS.length === 0 && <option value="">— none registered —</option>}
            {MISSIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 5 }}>
            Pupil ID{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — needed to award credits)</span>
          </label>
          <input
            type="text"
            value={pupilId}
            onChange={e => setPupilId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style={inputStyle}
            spellCheck={false}
          />
        </div>

        <button
          onClick={launch}
          disabled={!selectedKey || loading}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 28px',
            background: selectedKey && !loading ? '#4f46e5' : '#a5a3e8',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: selectedKey && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Loading…' : 'Launch Mission'}
        </button>
      </div>

      <div style={{ marginTop: '2.5rem', padding: '1rem', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
        <strong style={{ color: '#374151' }}>Notes</strong>
        <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
          <li>Mission runs in a full-screen overlay — Esc or browser back won't exit; use the "Back to Hub" button inside.</li>
          <li>Without a pupil ID the <code>complete_mission</code> RPC is a no-op — flow and credits screen still show correctly.</li>
          <li>Add new keys to <code>src/missions/index.js</code> <code>REGISTERED</code> as each mission file is built.</li>
        </ul>
      </div>
    </div>
  )
}
