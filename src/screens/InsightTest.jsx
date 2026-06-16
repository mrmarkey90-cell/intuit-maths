import { useEffect, useState } from 'react'
import { SUBDOMAIN_CONFIG, getActiveSubdomains, generateModuleSlots } from '../insight/domainConfig'
import InsightModule from '../insight/InsightModule'

function InsightTest() {
  const [level, setLevel] = useState(1)
  const [activeSubdomains, setActiveSubdomains] = useState(() => getActiveSubdomains(1))
  const [subdomain, setSubdomain] = useState(activeSubdomains[0])
  const [key, setKey] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [gridKey, setGridKey] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [gridSlots, setGridSlots] = useState([])

  useEffect(() => {
    const subs = getActiveSubdomains(level)
    setActiveSubdomains(subs)
    if (!subs.includes(subdomain)) setSubdomain(subs[0])
  }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setAnswer(null)
    setRevealed(false)
    setKey(k => k + 1)
  }

  function newGrid() {
    setGridSlots(generateModuleSlots(level))
    setGridKey(k => k + 1)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1rem' }}>Insight Module Test</h2>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Level</label>
        <select
          value={level}
          onChange={e => setLevel(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Level {s}</option>)}
        </select>

        <label style={{ fontWeight: 600, fontSize: 14 }}>Subdomain</label>
        <select
          value={subdomain}
          onChange={e => { setSubdomain(e.target.value); reset() }}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {activeSubdomains.map(code => (
            <option key={code} value={code}>
              {code} — {SUBDOMAIN_CONFIG[code].domainName} / {SUBDOMAIN_CONFIG[code].label}
            </option>
          ))}
        </select>

        <button onClick={reset} className="button-secondary">New question</button>
      </div>

      <div style={{ width: 260, marginBottom: '1rem' }}>
        <InsightModule
          key={key}
          subdomain={subdomain}
          level={level}
          onAnswer={setAnswer}
          locked={!!answer}
          revealed={revealed}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', height: 36, marginBottom: '2rem' }}>
        {answer && !revealed && (
          <button onClick={() => setRevealed(true)}>Reveal marking</button>
        )}
        {answer && (
          <span style={{ fontSize: 14, color: answer.correct ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {answer.correct ? '✓ Correct' : '✗ Wrong'}
          </span>
        )}
        {revealed && (
          <button className="button-secondary" onClick={reset}>Next question</button>
        )}
      </div>

      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => { setShowGrid(true); newGrid() }} className="button-secondary">
          Preview full 12-module grid for Level {level}
        </button>
      </div>

      {showGrid && (
        <div>
          <div style={{ marginBottom: '0.75rem' }}>
            <button onClick={newGrid} className="button-secondary">Reshuffle grid</button>
          </div>
          <div
            key={gridKey}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              maxWidth: 1040,
            }}
          >
            {gridSlots.map((code, i) => (
              <InsightModule
                key={`${gridKey}-${i}`}
                subdomain={code}
                level={level}
                onAnswer={() => {}}
                locked={false}
                revealed={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default InsightTest
