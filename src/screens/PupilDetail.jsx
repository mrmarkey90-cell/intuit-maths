import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import { SUBDOMAIN_CONFIG, getActiveSubdomains, DOMAIN_COLORS } from '../insight/domainConfig'

function StreakDots({ streak, t }) {
  return (
    <div className="streak-display">
      <div className="streak-dots">
        {[0, 1, 2].map(i => (
          <span key={i} className={`streak-dot ${i < streak ? 'streak-dot--filled' : ''}`} />
        ))}
      </div>
      <span className="streak-label">
        {streak === 0
          ? t('staffPupilDetail.streakLabelNone')
          : t('staffPupilDetail.streakLabelProgress').replace('{n}', streak)}
      </span>
    </div>
  )
}

function ScoreChart({ attempts, t }) {
  if (attempts.length === 0) return null

  const sorted = [...attempts].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
  const W = 560
  const H = 220
  const PAD = { top: 52, right: 24, bottom: 36, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const maxScore = Math.ceil(Math.max(...sorted.map(a => a.score), 10) / 5) * 5

  const gridLines = []
  for (let v = 0; v <= maxScore; v += 5) gridLines.push(v)

  const pts = sorted.map((a, i) => {
    const x = PAD.left + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW)
    const y = PAD.top + innerH - (a.score / maxScore) * innerH
    const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
    const date = new Date(a.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { x, y, pct, date, stage: a.stage, score: a.score, good: a.score >= 10 }
  })

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {gridLines.map(v => {
        const y = PAD.top + innerH - (v / maxScore) * innerH
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{v}</text>
          </g>
        )
      })}

      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#e5e7eb" strokeWidth="1" />

      <text
        x={10} y={PAD.top + innerH / 2}
        textAnchor="middle" fontSize="11" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.top + innerH / 2})`}
      >{t('staffPupilDetail.correctAxisLabel')}</text>

      {pts.length > 1 && (
        <path d={linePath} fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinejoin="round" />
      )}

      {pts.map((p, i) => (
        <g key={i}>
          <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4f46e5">
            L{p.stage}
          </text>
          <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="11" fill="#6b7280">
            {p.pct}%
          </text>
          <circle
            cx={p.x} cy={p.y} r="6"
            fill={p.good ? '#4f46e5' : '#a78bfa'}
            stroke="white" strokeWidth="2"
          />
          <text x={p.x} y={PAD.top + innerH + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {p.date}
          </text>
        </g>
      ))}
    </svg>
  )
}

function InsightStrengthPie({ strengths, insightLevel, t }) {
  const activeCodes = getActiveSubdomains(insightLevel)
  if (activeCodes.length === 0) return null

  const items = activeCodes.map(code => {
    const config = SUBDOMAIN_CONFIG[code] || {}
    const strength = Math.min(5, Math.max(0, Number(strengths[code] ?? 0)))
    return {
      code,
      label: config.label || code,
      color: DOMAIN_COLORS[config.domain] || '#6b7280',
      strength,
    }
  })

  const total = items.length
  const averageStrength = total > 0
    ? Math.round(items.reduce((sum, item) => sum + item.strength, 0) / total * 10) / 10
    : 0

  const R = 70
  const circumference = 2 * Math.PI * R
  const arcLength = circumference / total

  return (
    <div className="insight-strength-pie-wrap">
      <div className="insight-strength-pie-chart">
        <svg viewBox="0 0 200 200" className="insight-strength-svg">
          {items.map((item, index) => (
            <circle
              key={item.code}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={item.color}
              strokeWidth="28"
              strokeDasharray={`${arcLength} ${circumference}`}
              transform={`rotate(${index * 360 / total - 90} 100 100)`}
              strokeLinecap="butt"
            />
          ))}
          <circle cx="100" cy="100" r="45" fill="white" />
          <text x="100" y="98" textAnchor="middle" fontSize="12" fill="#6b7280">
            {t('staffPupilDetail.insightStrengthAverage')}
          </text>
          <text x="100" y="118" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111">
            {averageStrength}/5
          </text>
        </svg>
      </div>
      <div className="insight-strength-legend">
        {items.map(item => (
          <div key={item.code} className="insight-strength-legend-item">
            <span className="insight-strength-marker" style={{ background: item.color }} />
            <div>
              <div className="insight-strength-legend-name">{item.code} — {item.label}</div>
              <div className="insight-strength-legend-value">{item.strength}/5</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PupilDetail({ pupilId, onBack, onLevelChanged }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [overrideInstinct, setOverrideInstinct] = useState(1)
  const [overrideInsight, setOverrideInsight] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [insightStrengths, setInsightStrengths] = useState({})
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState(null)

  async function loadInsightStrengths(level) {
    setInsightLoading(true)
    setInsightError(null)

    const { data: rows, error } = await supabase.rpc('get_pupil_subdomain_strengths', { p_pupil_id: pupilId })
    if (error) {
      setInsightStrengths({})
      setInsightError(error.message)
      setInsightLoading(false)
      return
    }

    const strengths = {}
    for (const row of rows ?? []) {
      if (row.level === level && typeof row.subdomain === 'string') {
        strengths[row.subdomain] = Number(row.strength ?? 0)
      }
    }

    setInsightStrengths(strengths)
    setInsightLoading(false)
  }

  async function loadData() {
    const { data: result } = await supabase.rpc('get_pupil_history', { p_pupil_id: pupilId })
    setData(result)
    if (result?.pupil) {
      const insightLevelValue = result.pupil.insight_level ?? 1
      setOverrideInstinct(result.pupil.instinct_level ?? 1)
      setOverrideInsight(insightLevelValue)
      await loadInsightStrengths(insightLevelValue)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [pupilId])

  async function saveLevels() {
    setSaving(true)
    await supabase.rpc('set_pupil_levels', {
      p_pupil_id: pupilId,
      p_instinct_level: overrideInstinct,
      p_insight_level: overrideInsight,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onLevelChanged?.()
    await loadInsightStrengths(overrideInsight)
  }

  if (loading) return <div className="dashboard"><main className="dashboard-main"><p>{t('common.loading')}</p></main></div>
  if (!data?.pupil) return <div className="dashboard"><main className="dashboard-main"><p>{t('staffPupilDetail.pupilNotFound')}</p></main></div>

  const { pupil, attempts } = data
  const instinctLevel = pupil.instinct_level ?? 1
  const insightLevel = pupil.insight_level ?? 1
  const streak = pupil.challenge_streak ?? 0
  const insightStreak = pupil.insight_streak ?? 0

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← {t('common.back')}</button>
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main">
        <div className="page-title">
          <h1>{pupil.first_name} {pupil.last_name}</h1>
        </div>

        <section className="dashboard-section">
          <div className="section-heading"><h2>{t('staffPupilDetail.levels')}</h2></div>
          <div className="pupil-detail-levels">
            <div className="pupil-detail-level-block pupil-detail-level-block--instinct">
              <div className="level-block-header">
                <span className="level-block-label">Instinct</span>
                <span className="level-block-number">{instinctLevel}</span>
              </div>
              <StreakDots streak={streak} t={t} />
            </div>
            <div className="pupil-detail-level-block pupil-detail-level-block--insight">
              <div className="level-block-header">
                <span className="level-block-label">Insight</span>
                <span className="level-block-number">{insightLevel}</span>
              </div>
              <StreakDots streak={insightStreak} t={t} />
            </div>
          </div>
        </section>

        {insightLoading ? (
          <section className="dashboard-section">
            <div className="section-heading"><h2>{t('staffPupilDetail.insightSubdomainTitle')}</h2></div>
            <p>{t('common.loading')}</p>
          </section>
        ) : insightError ? (
          <section className="dashboard-section">
            <div className="section-heading"><h2>{t('staffPupilDetail.insightSubdomainTitle')}</h2></div>
            <p style={{ color: '#dc2626' }}>{insightError}</p>
          </section>
        ) : Object.keys(insightStrengths).length > 0 ? (
          <section className="dashboard-section">
            <div className="section-heading"><h2>{t('staffPupilDetail.insightSubdomainTitle')}</h2></div>
            <InsightStrengthPie strengths={insightStrengths} insightLevel={insightLevel} t={t} />
          </section>
        ) : (
          <section className="dashboard-section">
            <div className="section-heading"><h2>{t('staffPupilDetail.insightSubdomainTitle')}</h2></div>
            <p className="note">{t('staffPupilDetail.insightNoData')}</p>
          </section>
        )}

        <section className="dashboard-section">
          <div className="section-heading"><h2>{t('staffPupilDetail.overrideLevels')}</h2></div>
          <p className="note" style={{ marginBottom: '1rem' }}>
            {t('staffPupilDetail.overrideNote')}
          </p>
          <div className="level-override-form">
            <div className="level-override-row">
              <label className="level-override-label">Instinct</label>
              <select
                className="level-override-select"
                value={overrideInstinct}
                onChange={e => setOverrideInstinct(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="level-override-row">
              <label className="level-override-label">Insight</label>
              <select
                className="level-override-select"
                value={overrideInsight}
                onChange={e => setOverrideInsight(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button
              onClick={saveLevels}
              disabled={saving || (overrideInstinct === instinctLevel && overrideInsight === insightLevel)}
            >
              {saving ? t('common.saving') : saved ? t('staffPupilDetail.saved') : t('common.save')}
            </button>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('staffPupilDetail.instinctHistory')}</h2>
            <span className="section-count">{t('staffPupilDetail.sessionsCount').replace('{n}', attempts.length)}</span>
          </div>
          {attempts.length === 0 ? (
            <p className="note">{t('staffPupilDetail.noSessions')}</p>
          ) : (
            <ScoreChart attempts={attempts} t={t} />
          )}
        </section>
      </main>
    </div>
  )
}

export default PupilDetail
