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
  const [hovered, setHovered] = useState(null)
  const activeCodes = getActiveSubdomains(insightLevel)
  if (activeCodes.length === 0) return null

  const items = activeCodes.map(code => {
    const config = SUBDOMAIN_CONFIG[code] || {}
    const strength = Math.max(0, Number(strengths[code] ?? 0))
    return {
      code,
      label: config.label || code,
      color: DOMAIN_COLORS[config.domain] || '#6b7280',
      strength,
    }
  })

  const domains = []
  const seenDomains = new Set()
  for (const code of activeCodes) {
    const config = SUBDOMAIN_CONFIG[code]
    if (!config || seenDomains.has(config.domain)) continue
    seenDomains.add(config.domain)
    domains.push({ domain: config.domain, domainName: config.domainName, color: DOMAIN_COLORS[config.domain] })
  }

  const totalStrength = items.reduce((sum, item) => sum + item.strength, 0)
  const total = items.length
  const averageStrength = total > 0 ? Math.round((totalStrength / total) * 10) / 10 : 0

  const R = 90
  const circumference = 2 * Math.PI * R
  // A gap sized for a handful of slices (the old fixed 8) eats most of each
  // slice once 20+ subdomains are active at once, turning the ring into a
  // dashed scatter rather than a pie -- scale it down as slice count grows.
  const gap = Math.min(3, 40 / total)
  const usableCircumference = circumference - gap * total
  const sliceLength = item => (totalStrength > 0
    ? (item.strength / totalStrength) * usableCircumference
    : usableCircumference / total)

  return (
    <div className="insight-strength-wrap">
      <div className="insight-strength-pie-wrap">
        <svg viewBox="0 0 260 260" className="insight-strength-svg">
          {items.map((item, index) => {
            const offset = items.slice(0, index).reduce((sum, prev) => sum + sliceLength(prev) + gap, 0)
            return (
              <circle
                key={item.code}
                cx="130"
                cy="130"
                r={R}
                fill="none"
                stroke={item.color}
                strokeWidth={hovered?.code === item.code ? 32 : 28}
                strokeOpacity={!hovered || hovered.code === item.code ? 1 : 0.45}
                strokeDasharray={`${sliceLength(item)} ${circumference}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 130 130)"
                pointerEvents="stroke"
                cursor="pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item)}
                onBlur={() => setHovered(null)}
                tabIndex="0"
              />
            )
          })}
        </svg>
        <div className="insight-strength-center">
          <div className="insight-strength-center-title">
            {hovered ? hovered.label : t('staffPupilDetail.insightStrengthAverage')}
          </div>
          <div className="insight-strength-center-value">
            {hovered ? t('staffPupilDetail.insightStrengthScore').replace('{n}', hovered.strength) : averageStrength}
          </div>
        </div>
      </div>
      <div className="insight-strength-domain-legend">
        {domains.map(d => (
          <span key={d.domain} className="insight-strength-domain-chip">
            <span className="insight-strength-domain-swatch" style={{ background: d.color }} />
            {d.domainName}
          </span>
        ))}
      </div>
    </div>
  )
}

function getStrongestWeakest(strengths) {
  const entries = Object.entries(strengths).map(([code, strength]) => ({
    code,
    label: SUBDOMAIN_CONFIG[code]?.label || code,
    strength: Number(strength) || 0,
  }))
  if (entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => b.strength - a.strength)
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
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
    await loadData()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onLevelChanged?.()
  }

  if (loading) return <div className="dashboard"><main className="dashboard-main"><p>{t('common.loading')}</p></main></div>
  if (!data?.pupil) return <div className="dashboard"><main className="dashboard-main"><p>{t('staffPupilDetail.pupilNotFound')}</p></main></div>

  const { pupil, attempts } = data
  const instinctLevel = pupil.instinct_level ?? 1
  const insightLevel = pupil.insight_level ?? 1
  const streak = pupil.challenge_streak ?? 0
  const insightStreak = pupil.insight_streak ?? 0
  const strengthSummary = getStrongestWeakest(insightStrengths)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← {t('common.back')}</button>
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main" style={{ maxWidth: 960 }}>
        <div className="page-title">
          <h1>{pupil.first_name} {pupil.last_name}</h1>
        </div>

        <div className="pupil-detail-levels">
          <section className="pupil-detail-level-block pupil-detail-level-block--instinct">
            <div className="level-block-header">
              <span className="level-block-label">Instinct</span>
              <span className="level-block-number">{instinctLevel}</span>
            </div>
            <StreakDots streak={streak} t={t} />

            <div className="section-heading pupil-detail-macro-subheading">
              <h2>{t('staffPupilDetail.instinctHistory')}</h2>
              <span className="section-count">{t('staffPupilDetail.sessionsCount').replace('{n}', attempts.length)}</span>
            </div>
            {attempts.length === 0 ? (
              <p className="note">{t('staffPupilDetail.noSessions')}</p>
            ) : (
              <ScoreChart attempts={attempts} t={t} />
            )}
          </section>

          <section className="pupil-detail-level-block pupil-detail-level-block--overview">
            <div className="level-block-header">
              <span className="level-block-label">{t('staffPupilDetail.overviewTitle')}</span>
              <div className="pupil-detail-overview-credits">
                <span className="level-block-number">{pupil.credits ?? 0}</span>
                <span className="pupil-detail-overview-caption">{t('staffPupilDetail.credits')}</span>
              </div>
            </div>

            <div className="section-heading pupil-detail-macro-subheading">
              <h2>{t('staffPupilDetail.quickInsightsTitle').replace('{n}', insightLevel)}</h2>
            </div>
            {strengthSummary ? (
              <div className="pupil-detail-strength-summary">
                <div className="pupil-detail-strength-row">
                  <span className="pupil-detail-strength-tag pupil-detail-strength-tag--strong">{t('staffPupilDetail.strongest')}</span>
                  <span>{strengthSummary.strongest.label}</span>
                </div>
                <div className="pupil-detail-strength-row">
                  <span className="pupil-detail-strength-tag pupil-detail-strength-tag--weak">{t('staffPupilDetail.weakest')}</span>
                  <span>{strengthSummary.weakest.label}</span>
                </div>
              </div>
            ) : (
              <p className="note">{t('staffPupilDetail.insightStrengthNoData')}</p>
            )}
          </section>

          <section className="pupil-detail-level-block pupil-detail-level-block--insight">
            <div className="level-block-header">
              <span className="level-block-label">Insight</span>
              <span className="level-block-number">{insightLevel}</span>
            </div>
            <StreakDots streak={insightStreak} t={t} />

            <div className="section-heading pupil-detail-macro-subheading">
              <h2>{t('staffPupilDetail.insightStrengthsTitle')}</h2>
            </div>
            {insightLoading ? (
              <p>{t('common.loading')}</p>
            ) : insightError ? (
              <p style={{ color: '#dc2626' }}>{insightError}</p>
            ) : Object.keys(insightStrengths).length > 0 ? (
              <InsightStrengthPie strengths={insightStrengths} insightLevel={insightLevel} t={t} />
            ) : (
              <p className="note">{t('staffPupilDetail.insightStrengthNoData')}</p>
            )}
          </section>
        </div>

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
      </main>
    </div>
  )
}

export default PupilDetail
