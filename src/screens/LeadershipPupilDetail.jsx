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
        {streak === 0 ? t('leadershipPupilDetail.noStreak') : t('leadershipPupilDetail.streakProgress').replace('{n}', streak)}
      </span>
    </div>
  )
}

function ScoreChart({ attempts, t }) {
  if (attempts.length === 0) return null
  const sorted = [...attempts].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
  const W = 560, H = 220
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
      <text x={10} y={PAD.top + innerH / 2} textAnchor="middle" fontSize="11" fill="#9ca3af"
        transform={`rotate(-90, 10, ${PAD.top + innerH / 2})`}>{t('leadershipPupilDetail.correctAxisLabel')}</text>
      {pts.length > 1 && <path d={linePath} fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <g key={i}>
          <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4f46e5">L{p.stage}</text>
          <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="11" fill="#6b7280">{p.pct}%</text>
          <circle cx={p.x} cy={p.y} r="6" fill={p.good ? '#4f46e5' : '#a78bfa'} stroke="white" strokeWidth="2" />
          <text x={p.x} y={PAD.top + innerH + 22} textAnchor="middle" fontSize="10" fill="#9ca3af">{p.date}</text>
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
            {hovered ? hovered.label : t('leadershipPupilDetail.insightStrengthAverage')}
          </div>
          <div className="insight-strength-center-value">
            {hovered ? t('leadershipPupilDetail.insightStrengthScore').replace('{n}', hovered.strength) : averageStrength}
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

function lastActiveLabel(dateStr, t) {
  if (!dateStr) return t('common.never')
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days === 0) return t('common.today')
  if (days === 1) return t('common.yesterday')
  if (days < 7) return t('common.daysAgo').replace('{n}', days)
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function LeadershipPupilDetail({ pupilId, onBack, onPupilDeleted }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [allClasses, setAllClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_pupil_history', { p_pupil_id: pupilId }),
      supabase.from('classes').select('id, name').order('name'),
    ]).then(([{ data: history }, { data: classes }]) => {
      setData(history)
      setAllClasses(classes ?? [])
      if (history?.pupil?.class_id) setSelectedClassId(history.pupil.class_id)
      setLoading(false)
      if (history?.pupil) loadInsightStrengths(history.pupil.insight_level ?? 1)
    })
  }, [pupilId])

  async function handleMove() {
    setMoving(true)
    setMoveSuccess(false)
    const classId = selectedClassId || null
    const { data: result } = await supabase.rpc('move_pupil', {
      p_pupil_id: pupilId,
      p_class_id: classId,
    })
    if (result?.ok) setMoveSuccess(true)
    setMoving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const { data: result } = await supabase.rpc('delete_pupil', { p_pupil_id: pupilId })
    if (result?.ok) onPupilDeleted()
    else setDeleting(false)
  }

  if (loading) return <div className="screen"><p>{t('common.loading')}</p></div>
  if (!data?.pupil) return <div className="screen"><p>{t('leadershipPupilDetail.pupilNotFound')}</p></div>

  const { pupil, attempts } = data
  const instinctLevel = pupil.instinct_level ?? 1
  const insightLevel = pupil.insight_level ?? 1
  const streak = pupil.challenge_streak ?? 0
  const insightStreak = pupil.insight_streak ?? 0
  const strengthSummary = getStrongestWeakest(insightStrengths)
  const lastAttempt = attempts?.length > 0
    ? attempts.slice().sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0]
    : null

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
              <h2>{t('leadershipPupilDetail.instinctHistory')}</h2>
              <span className="section-count">{t('leadershipPupilDetail.sessionsCount').replace('{n}', attempts?.length ?? 0)}</span>
            </div>
            {!attempts?.length ? (
              <p className="note">{t('leadershipPupilDetail.noSessions')}</p>
            ) : (
              <ScoreChart attempts={attempts} t={t} />
            )}
          </section>

          <section className="pupil-detail-level-block pupil-detail-level-block--overview">
            <div className="level-block-header">
              <span className="level-block-label">{t('leadershipPupilDetail.overviewTitle')}</span>
              <div className="pupil-detail-overview-credits">
                <span className="level-block-number">{pupil.credits ?? 0}</span>
                <span className="pupil-detail-overview-caption">{t('leadershipPupilDetail.credits')}</span>
              </div>
            </div>
            <p className="note" style={{ marginTop: '0.75rem' }}>
              {t('leadershipPupilDetail.lastActive')}: {lastActiveLabel(lastAttempt?.completed_at, t)}
            </p>

            <div className="section-heading pupil-detail-macro-subheading">
              <h2>{t('leadershipPupilDetail.quickInsightsTitle').replace('{n}', insightLevel)}</h2>
            </div>
            {strengthSummary ? (
              <div className="pupil-detail-strength-summary">
                <div className="pupil-detail-strength-row">
                  <span className="pupil-detail-strength-tag pupil-detail-strength-tag--strong">{t('leadershipPupilDetail.strongest')}</span>
                  <span>{strengthSummary.strongest.label}</span>
                </div>
                <div className="pupil-detail-strength-row">
                  <span className="pupil-detail-strength-tag pupil-detail-strength-tag--weak">{t('leadershipPupilDetail.weakest')}</span>
                  <span>{strengthSummary.weakest.label}</span>
                </div>
              </div>
            ) : (
              <p className="note">{t('leadershipPupilDetail.insightStrengthNoData')}</p>
            )}
          </section>

          <section className="pupil-detail-level-block pupil-detail-level-block--insight">
            <div className="level-block-header">
              <span className="level-block-label">Insight</span>
              <span className="level-block-number">{insightLevel}</span>
            </div>
            <StreakDots streak={insightStreak} t={t} />

            <div className="section-heading pupil-detail-macro-subheading">
              <h2>{t('leadershipPupilDetail.insightStrengthsTitle')}</h2>
            </div>
            {insightLoading ? (
              <p>{t('common.loading')}</p>
            ) : insightError ? (
              <p style={{ color: '#dc2626' }}>{insightError}</p>
            ) : Object.keys(insightStrengths).length > 0 ? (
              <InsightStrengthPie strengths={insightStrengths} insightLevel={insightLevel} t={t} />
            ) : (
              <p className="note">{t('leadershipPupilDetail.insightStrengthNoData')}</p>
            )}
          </section>
        </div>

        <section className="dashboard-section">
          <h2 style={{ marginBottom: '0.75rem' }}>{t('leadershipPupilDetail.moveToClass')}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setMoveSuccess(false) }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' }}
            >
              <option value="">{t('leadershipPupilDetail.unallocatedOption')}</option>
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleMove} disabled={moving} className="button-secondary">
              {moving ? t('common.saving') : t('common.save')}
            </button>
          </div>
          {moveSuccess && <p className="success" style={{ marginTop: '0.5rem' }}>{t('leadershipPupilDetail.movedSuccessfully')}</p>}
        </section>

        <section className="dashboard-section dashboard-section--danger">
          <h2 style={{ marginBottom: '0.75rem' }}>{t('leadershipPupilDetail.deletePupil')}</h2>
          {!confirmingDelete ? (
            <>
              <p className="note" style={{ marginBottom: '1rem' }}>
                {t('leadershipPupilDetail.deleteNote')}
              </p>
              <button className="button-danger" onClick={() => setConfirmingDelete(true)}>
                {t('leadershipPupilDetail.deletePupil')}
              </button>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                {t('leadershipPupilDetail.confirmDelete').replace('{name}', `${pupil.first_name} ${pupil.last_name}`)}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="button-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? t('common.deleting') : t('classDetail.yesDeletePermanently')}
                </button>
                <button className="button-secondary" onClick={() => setConfirmingDelete(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default LeadershipPupilDetail
