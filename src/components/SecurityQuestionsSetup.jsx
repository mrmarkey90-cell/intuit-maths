import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SecurityQuestionCircle from './SecurityQuestionCircle'
import { SECURITY_QUESTION_KEYS } from '../lib/securityQuestions'

// Asks all 5 categories once, in sequence, then saves and hands back to
// the caller. Used right after profile creation, and again (via
// PupilVerification) whenever a teacher has reset a pupil's answers.
function SecurityQuestionsSetup({ pupilId, onComplete }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  const categoryKey = SECURITY_QUESTION_KEYS[index]

  async function handleAnswer(optionKey) {
    const updated = { ...answers, [categoryKey]: optionKey }
    setAnswers(updated)

    if (index + 1 < SECURITY_QUESTION_KEYS.length) {
      setIndex(index + 1)
      return
    }

    setSaving(true)
    await supabase.rpc('save_security_answers', { p_pupil_id: pupilId, p_answers: updated })
    setSaving(false)
    onComplete()
  }

  if (saving) return <div className="screen"><p>{t('common.saving')}</p></div>

  return (
    <div className="screen">
      <p className="tagline">{t('securityQuestions.setupIntro')}</p>
      <SecurityQuestionCircle key={categoryKey} categoryKey={categoryKey} onAnswer={handleAnswer} />
    </div>
  )
}

export default SecurityQuestionsSetup
