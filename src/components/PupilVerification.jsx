import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SecurityQuestionsSetup from './SecurityQuestionsSetup'
import SecurityQuestionsVerify from './SecurityQuestionsVerify'

// Orchestrator for the pupil identity check, used everywhere a child
// selects their own name tile (the Hub and a direct /play join). Decides
// setup vs verify based on whether this pupil has answered before --
// never fetches the actual stored answers, only a boolean status.
function PupilVerification({ pupilId, onVerified, onBack }) {
  const { t } = useTranslation()
  const [hasAnswers, setHasAnswers] = useState(null) // null = loading

  useEffect(() => {
    async function init() {
      const { data } = await supabase.rpc('get_pupil_security_status', { p_pupil_id: pupilId })
      setHasAnswers(!!data)
    }
    init()
  }, [pupilId])

  if (hasAnswers === null) return <div className="screen"><p>{t('common.loading')}</p></div>

  if (!hasAnswers) {
    return <SecurityQuestionsSetup pupilId={pupilId} onComplete={onVerified} />
  }

  return <SecurityQuestionsVerify pupilId={pupilId} onSuccess={onVerified} onBack={onBack} />
}

export default PupilVerification
