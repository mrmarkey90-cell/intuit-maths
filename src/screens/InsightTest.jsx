import { useState } from 'react'
import { DOMAIN_CONFIG } from '../insight/domainConfig'
import InsightModule from '../insight/InsightModule'

const ALL_DOMAINS = Object.keys(DOMAIN_CONFIG)

function InsightTest() {
  const [domain, setDomain] = useState('simple_addition')
  const [stage, setStage] = useState(1)
  const [key, setKey] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function reset() {
    setAnswer(null)
    setRevealed(false)
    setKey(k => k + 1)
  }

  function handleDomainChange(d) {
    setDomain(d)
    reset()
  }

  function handleStageChange(s) {
    setStage(Number(s))
    reset()
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1rem' }}>Insight Module Test</h2>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Domain</label>
        <select
          value={domain}
          onChange={e => handleDomainChange(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {ALL_DOMAINS.map(d => (
            <option key={d} value={d}>
              {DOMAIN_CONFIG[d].label} — Stage {DOMAIN_CONFIG[d].stage}
            </option>
          ))}
        </select>

        <label style={{ fontWeight: 600, fontSize: 14 }}>Stage</label>
        <select
          value={stage}
          onChange={e => handleStageChange(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {[1, 2, 3, 4, 5, 6].map(s => (
            <option key={s} value={s}>Stage {s}</option>
          ))}
        </select>

        <button onClick={reset} className="button-secondary">New question</button>
      </div>

      {/* Module at its real card size */}
      <div style={{ width: 320, marginBottom: '1rem' }}>
        <InsightModule
          key={key}
          domain={domain}
          stage={stage}
          onAnswer={setAnswer}
          locked={!!answer}
          revealed={revealed}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', height: 36 }}>
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
    </div>
  )
}

export default InsightTest
