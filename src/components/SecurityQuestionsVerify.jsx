import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import SecurityQuestionCircle from './SecurityQuestionCircle'
import { pickRandomCategories } from '../lib/securityQuestions'

// Asks 2 random categories, then checks the guess server-side -- the
// correct answers never reach this component, only a true/false result.
// No retry loop on failure: this is a soft deterrent, not real auth, and
// letting a wrong guess retry indefinitely would make 2-of-5 trivially
// brute-forceable.
function SecurityQuestionsVerify({ pupilId, onSuccess, onBack }) {
  const { t } = useTranslation()
  const [categories] = useState(() => pickRandomCategories(2))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)

  const categoryKey = categories[index]

  async function handleAnswer(optionKey) {
    const updated = { ...answers, [categoryKey]: optionKey }
    setAnswers(updated)

    if (index + 1 < categories.length) {
      setIndex(index + 1)
      return
    }

    setChecking(true)
    const { data } = await supabase.rpc('verify_security_answers', {
      p_pupil_id: pupilId,
      p_answers: updated,
    })
    setChecking(false)
    if (data) onSuccess()
    else setFailed(true)
  }

  if (failed) return (
    <div className="screen">
      <p className="security-question-failed">{t('securityQuestions.verifyFailed')}</p>
      <button className="button-secondary" onClick={onBack}>{t('securityQuestions.back')}</button>
    </div>
  )

  if (checking) return <div className="screen"><p>{t('common.loading')}</p></div>

  return (
    <div className="screen">
      <SecurityQuestionCircle key={categoryKey} categoryKey={categoryKey} onAnswer={handleAnswer} />
    </div>
  )
}

export default SecurityQuestionsVerify
