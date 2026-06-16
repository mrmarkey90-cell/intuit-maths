import { useEffect, useState } from 'react'
import { SUBDOMAIN_CONFIG, getActiveSubdomains, generateModuleSlots } from '../insight/domainConfig'
import InsightModule from '../insight/InsightModule'
import InsightResults from '../insight/InsightResults'

function QuickTester() {
  const [level, setLevel] = useState(1)
  const [activeSubdomains, setActiveSubdomains] = useState(() => getActiveSubdomains(1))
  const [subdomain, setSubdomain] = useState(activeSubdomains[0])
  const [key, setKey] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ marginBottom: '1rem' }}>Quick Module Tester</h2>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
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

      <div style={{ width: 640, marginBottom: '1rem' }}>
        <InsightModule
          key={key}
          subdomain={subdomain}
          level={level}
          onAnswer={setAnswer}
          locked={revealed}
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

function Carousel({ level, onRestart }) {
  const [slots] = useState(() => generateModuleSlots(level))
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState({})
  const [view, setView] = useState('questions') // questions | marking | results | review

  const total = slots.length
  const answeredCount = Object.keys(results).length
  const correctCount = Object.values(results).filter(r => r.correct).length

  const locked = view !== 'questions'
  const revealed = view === 'review'
  const isLast = current === total - 1

  function handleSubmit() {
    setView('marking')
    setTimeout(() => setView('results'), 1800)
  }

  function goPrev() { setCurrent(c => Math.max(0, c - 1)) }
  function goNext() { setCurrent(c => Math.min(total - 1, c + 1)) }

  // IMPORTANT: the module grid below must stay mounted for the Carousel's
  // entire lifetime (toggled with CSS display, never removed from the
  // React tree) — conditionally returning different JSX per view would
  // unmount all 12 InsightModules, regenerating fresh random questions
  // and losing every answer when navigating back in for "review".
  const showQuestions = view === 'questions' || view === 'review'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: view === 'marking' ? 'block' : 'none' }}>
        <div className="session-active" style={{ minHeight: 280 }}>
          <div className="session-timer" style={{ fontSize: '2.5rem', color: '#818cf8' }}>
            Marking your answers...
          </div>
          <p className="session-active-label">One moment</p>
        </div>
      </div>

      <div style={{ display: view === 'results' ? 'block' : 'none' }}>
        <InsightResults
          score={correctCount}
          total={total}
          onReviewMarking={() => { setCurrent(0); setView('review') }}
          onRestart={onRestart}
        />
      </div>

      <div style={{ display: showQuestions ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' }}>
        {view === 'review' && (
          <button className="button-secondary" onClick={() => setView('results')} style={{ marginBottom: '1rem' }}>
            ← Back to results
          </button>
        )}

        <span className="insight-carousel-position">Question {current + 1} of {total}</span>

        <div className="insight-carousel-row">
          <button className="insight-carousel-arrow" onClick={goPrev} disabled={current === 0} aria-label="Previous question">
            ←
          </button>

          <div style={{ width: 640 }}>
            {slots.map((code, i) => (
              <div key={i} style={{ display: i === current ? 'block' : 'none' }}>
                <InsightModule
                  subdomain={code}
                  level={level}
                  locked={locked}
                  revealed={revealed}
                  onAnswer={result => setResults(r => ({ ...r, [i]: result }))}
                />
              </div>
            ))}
          </div>

          {view === 'questions' && isLast ? (
            <button className="insight-carousel-submit" onClick={handleSubmit}>
              Submit
            </button>
          ) : (
            <button className="insight-carousel-arrow" onClick={goNext} disabled={isLast} aria-label="Next question">
              →
            </button>
          )}
        </div>

        {view === 'questions' && isLast && (
          <span className="insight-carousel-answered-count">{answeredCount}/{total} answered</span>
        )}
      </div>
    </div>
  )
}

function InsightTest() {
  const [level, setLevel] = useState(1)
  const [showCarousel, setShowCarousel] = useState(false)
  const [carouselKey, setCarouselKey] = useState(0)

  function startTest() {
    setShowCarousel(true)
    setCarouselKey(k => k + 1)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
      <QuickTester />

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <h2 style={{ marginBottom: '1rem' }}>Full Test Preview (one question at a time)</h2>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Level</label>
        <select
          value={level}
          onChange={e => setLevel(Number(e.target.value))}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Level {s}</option>)}
        </select>
        <button className="button-secondary" onClick={startTest}>Start new test</button>
      </div>

      {showCarousel && <Carousel key={carouselKey} level={level} onRestart={startTest} />}
    </div>
  )
}

export default InsightTest
