import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'

function lastActiveLabel(dateStr, t) {
  if (!dateStr) return t('common.never')
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days === 0) return t('common.today')
  if (days === 1) return t('common.yesterday')
  if (days < 7) return t('common.daysAgo').replace('{n}', days)
  if (days < 30) return t('common.weeksAgo').replace('{n}', Math.floor(days / 7))
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function LeadershipClassDetail({ classId, onBack, onSelectPupil, onClassDeleted }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [selected, setSelected] = useState(new Set())
  const [confirmingUnallocate, setConfirmingUnallocate] = useState(false)
  const [unallocating, setUnallocating] = useState(false)

  useEffect(() => {
    supabase.rpc('get_leadership_class_detail', { p_class_id: classId }).then(({ data: result }) => {
      setData(result)
      setLoading(false)
    })
  }, [classId])

  async function handleDelete() {
    setDeleting(true)
    const { data: result } = await supabase.rpc('delete_class', { p_class_id: classId })
    if (result?.ok) onClassDeleted(classId)
    else setDeleting(false)
  }

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleUnallocate() {
    setUnallocating(true)
    await supabase.rpc('unallocate_pupils', { p_pupil_ids: [...selected] })
    setData(prev => ({ ...prev, pupils: prev.pupils.filter(p => !selected.has(p.id)) }))
    setSelected(new Set())
    setConfirmingUnallocate(false)
    setUnallocating(false)
  }

  if (loading) return <div className="screen"><p>{t('common.loading')}</p></div>
  if (!data || data.error) return <div className="screen"><p>{t('classDetail.classNotFound')}</p></div>

  const { class: cls, pupils } = data

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="button-secondary" onClick={onBack}>← {t('common.back')}</button>
        <div className="dashboard-header-brand"><img src="/intuit-name.svg" alt="intuit" /></div>
      </header>

      <main className="dashboard-main">
        <div className="page-title">
          <h1>{cls.name}</h1>
        </div>

        {selected.size > 0 && (
          <section className="dashboard-section" style={{ borderColor: '#fca5a5', background: '#fff9f9' }}>
            {!confirmingUnallocate ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <span className="note">{t('classDetail.pupilsSelected').replace('{n}', selected.size)}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="button-secondary" onClick={() => setSelected(new Set())}>{t('common.clear')}</button>
                  <button className="button-danger" onClick={() => setConfirmingUnallocate(true)}>
                    {t('classDetail.unallocate')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                  {t('classDetail.confirmUnallocate').replace('{n}', selected.size).replace('{name}', cls.name)}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="button-danger" onClick={handleUnallocate} disabled={unallocating}>
                    {unallocating ? t('common.unallocating') : t('classDetail.yesUnallocate')}
                  </button>
                  <button className="button-secondary" onClick={() => setConfirmingUnallocate(false)}>{t('common.cancel')}</button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="dashboard-section">
          <div className="section-heading">
            <h2>{t('classDetail.pupils')}</h2>
            <span className="section-count">{pupils.length}</span>
          </div>
          {pupils.length === 0 ? (
            <p className="note">{t('classDetail.noPupils')}</p>
          ) : (
            <div className="pupil-list">
              {pupils.map(p => (
                <div key={p.id} className="pupil-list-row">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    style={{ marginRight: '0.75rem', width: 18, height: 18, flexShrink: 0 }}
                  />
                  <span className="pupil-list-name" onClick={() => onSelectPupil(p.id)} style={{ cursor: 'pointer' }}>
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="pupil-list-meta">
                    <span className="pupil-list-level">L{p.instinct_level}</span>
                    <span className="note">{lastActiveLabel(p.last_attempt_at, t)}</span>
                  </span>
                  <span className="pupil-list-arrow" onClick={() => onSelectPupil(p.id)} style={{ cursor: 'pointer' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section dashboard-section--danger">
          <h2 style={{ marginBottom: '0.75rem' }}>{t('classDetail.deleteClass')}</h2>
          {!confirming ? (
            <>
              <p className="note" style={{ marginBottom: '1rem' }}>
                {t('classDetail.deleteClassNote')}
              </p>
              <button className="button-danger" onClick={() => setConfirming(true)}>
                {t('classDetail.deleteClass')}
              </button>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                {t('classDetail.confirmDelete').replace('{name}', cls.name)}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="button-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? t('common.deleting') : t('classDetail.yesDeletePermanently')}
                </button>
                <button className="button-secondary" onClick={() => setConfirming(false)}>
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

export default LeadershipClassDetail
