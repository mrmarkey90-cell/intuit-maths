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

function PlacementLogo() {
  return <img src="/intuit-name.svg" alt="intuit" className="placement-test-logo" />
}

function PlacementTest({ pupilId, onComplete }) {
  const { t } = useTranslation()

  const [view, setView] = useState('intro') // intro | question | submitting | done
  const [level, setLevel] = useState(PLACEMENT_START_LEVEL)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [subdomain, setSubdomain] = useState(() => pickPlacementSubdomain(PLACEMENT_START_LEVEL))
  const [levelHistory, setLevelHistory] = useState([])
  const [correctCount, setCorrectCount] = useState(0)
  // liveCorrect tracks the module's latest reported answer -- several
  // module types (Share, MultiSelect, DragSort, PairSum) report via a
  // useEffect that fires immediately on mount with their empty/default
  // state, then again on every change, rather than once on an explicit
  // submit. So this must stay "live" (overwritten on each call) rather
  // than locking the module on the first call, or those types would lock
  // out before the child has touched anything.
  const [liveCorrect, setLiveCorrect] = useState(null)
  const [idk, setIdk] = useState(false)

  function handleModuleAnswer({ correct }) {
    if (idk) return
    setLiveCorrect(correct)
  }

  function handleIdk() {
    if (idk) return
    setIdk(true)
  }

  async function advance() {
    const correct = idk ? false : (liveCorrect ?? false)
    const newHistory = [...levelHistory, level]
    const newCorrectCount = correct ? correctCount + 1 : correctCount

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

    const newLevel = nextStaircaseLevel(level, correct)
    setLevelHistory(newHistory)
    setCorrectCount(newCorrectCount)
    setLevel(newLevel)
    setSubdomain(pickPlacementSubdomain(newLevel))
    setLiveCorrect(null)
    setIdk(false)
    setQuestionIndex(i => i + 1)
  }

  if (view === 'intro') return (
    <div className="screen placement-test-screen">
      <PlacementLogo />
      <h1>{t('placementTest.intro.title')}</h1>
      <button onClick={() => setView('question')}>{t('placementTest.intro.start')}</button>
    </div>
  )

  if (view === 'submitting') return (
    <div className="screen placement-test-screen">
      <PlacementLogo />
      <p>{t('placementTest.submitting')}</p>
    </div>
  )

  if (view === 'done') return (
    <div className="screen placement-test-screen">
      <PlacementLogo />
      <h1>{t('placementTest.done.title')}</h1>
      <p className="tagline">{t('placementTest.done.body')}</p>
      <button onClick={onComplete}>{t('common.continue')}</button>
    </div>
  )

  return (
    <div className="screen placement-test-screen">
      <PlacementLogo />

      <div className="placement-progress-track">
        <div
          className="placement-progress-fill"
          style={{ width: `${((questionIndex + 1) / PLACEMENT_QUESTION_COUNT) * 100}%` }}
        />
      </div>

      <div className="insight-carousel-row">
        <div className="placement-test-side-col" aria-hidden="true" />

        <div className="insight-carousel-module-wrap">
          <InsightModule
            key={questionIndex}
            subdomain={subdomain}
            level={level}
            locked={idk}
            revealed={false}
            onAnswer={handleModuleAnswer}
          />
        </div>

        <div className="placement-test-side-col placement-test-side-actions">
          <button className="insight-carousel-arrow" onClick={advance} aria-label="Next question">
            →
          </button>
          <button
            className="button-secondary placement-test-idk"
            onClick={handleIdk}
            disabled={idk}
          >
            {t('placementTest.idk')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlacementTest
