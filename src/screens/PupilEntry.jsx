import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import PupilSession from './session/PupilSession'
import PupilHub from './PupilHub'

// Single root-level pupil entry point (intuited.uk/[code]) -- resolves
// what the code actually means server-side (resolve_pupil_code) before
// deciding which real flow to mount, rather than relying on a URL prefix
// to say so. Session codes (dynamic, fresh per Instinct challenge) go to
// PupilSession; class codes (static, permanent) go to PupilHub, which
// itself now also covers what used to be the separate /join flow.
function PupilEntry() {
  const { code } = useParams()
  const { t } = useTranslation()
  const [type, setType] = useState('loading') // loading | session | class | not_found

  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('resolve_pupil_code', { p_code: code })
      setType(data?.type ?? 'not_found')
    }
    init()
  }, [code])

  if (type === 'loading') return <div className="screen"><p>{t('common.loading')}</p></div>

  if (type === 'session') return <PupilSession code={code} />

  if (type === 'class') return <PupilHub joinCode={code} />

  return (
    <div className="screen">
      <h1>{t('pupilJoin.classNotFound')}</h1>
      <p className="tagline">{t('pupilJoin.checkLink')}</p>
    </div>
  )
}

export default PupilEntry
