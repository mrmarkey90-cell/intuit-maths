import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import InsightModule from './InsightModule'
import {
  PLACEMENT_QUESTION_COUNT,
  PLACEMENT_START_LEVEL,
  pickPlacementSubdomain,
  nextStaircaseLevel,
  computeFinalLevel,
} from './placementTest'

function PlacementTest({ pupilId, onComplete }) {
  const { t } = useTranslation()

  const [view, setView] = useState('intro') // intro | question | submitting | done
  const [level, setLevel] = useState(PLACEMENT_START_LEVEL)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [subdomain, setSubdomain] = useState(() => pickPlacementSubdomain(PLACEMENT_START_LEVEL))
  const [levelHistory, setLevelHistory] = useState([])
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(null) // null | { correct }

  function handleModuleAnswer({ correct }) {
    if (answered) return
    setAnswered({ correct })
  }

  function handleIdk() {
    if (answered) return
    setAnswered({ correct: false })
  }

  async function advance() {
    const newHistory = [...levelHistory, level]
    const newCorrectCount = answered.correct ? correctCount + 1 : correctCount

    if (newHistory.length >= PLACEMENT_QUESTION_COUNT) {
      setLevelHistory(newHistory)
      setCorrectCount(newCorrectCount)
      setView('submitting')

      const finalLevel = computeFinalLevel(newHistory)
      await supabase.rpc('submit_placement_test', {
        p_pupil_id: pupilId,
        p_level: finalLevel,
        p_score: newCorrectCount,
        p_total: PLACEMENT_QUESTION_COUNT,
      })

      setView('done')
      return
    }

    const newLevel = nextStaircaseLevel(level, answered.correct)
    setLevelHistory(newHistory)
    setCorrectCount(newCorrectCount)
    setLevel(newLevel)
    setSubdomain(pickPlacementSubdomain(newLevel))
    setAnswered(null)
    setQuestionIndex(i => i + 1)
  }

  if (view === 'intro') return (
    <div className="screen placement-test-screen">
      <h1>{t('placementTest.intro.title')}</h1>
      <p className="tagline">{t('placementTest.intro.body')}</p>
      <button onClick={() => setView('question')}>{t('placementTest.intro.start')}</button>
    </div>
  )

  if (view === 'submitting') return (
    <div className="screen placement-test-screen">
      <p>{t('placementTest.submitting')}</p>
    </div>
  )

  if (view === 'done') return (
    <div className="screen placement-test-screen">
      <h1>{t('placementTest.done.title')}</h1>
      <p className="tagline">{t('placementTest.done.body')}</p>
      <button onClick={onComplete}>{t('common.continue')}</button>
    </div>
  )

  return (
    <div className="screen placement-test-screen">
      <span className="insight-carousel-position">
        {t('placementTest.questionOf').replace('{n}', questionIndex + 1).replace('{total}', PLACEMENT_QUESTION_COUNT)}
      </span>

      <div className="insight-carousel-module-wrap">
        <InsightModule
          key={questionIndex}
          subdomain={subdomain}
          level={level}
          locked={answered !== null}
          revealed={false}
          onAnswer={handleModuleAnswer}
        />
      </div>

      <div className="placement-test-actions">
        <button
          className="button-secondary"
          onClick={handleIdk}
          disabled={answered !== null}
        >
          {t('placementTest.idk')}
        </button>

        {answered !== null && (
          <button onClick={advance}>{t('common.continue')}</button>
        )}
      </div>
    </div>
  )
}

export default PlacementTest
