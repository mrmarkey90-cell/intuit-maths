import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTranslation } from '../i18n/LanguageContext'
import InsightModule from './InsightModule'
import {
  PLACEMENT_MAX_QUESTIONS,
  PLACEMENT_CONFIDENCE_LEVELS,
  pickPlacementSubdomain,
  initialLevelTrackers,
  applyPlacementAnswer,
} from './placementStaircase'

function PlacementLogo() {
  return <img src="/intuit-name.svg" alt="intuit" className="placement-test-logo" />
}

const CONFIDENCE_OPTIONS = [
  { key: 'unhappy', emoji: '😟' },
  { key: 'mild', emoji: '😐' },
  { key: 'happy', emoji: '😄' },
]

function PlacementTest({ pupilId, onComplete }) {
  const { t } = useTranslation()

  const [view, setView] = useState('intro') // intro | confidence | question | submitting | done
  const [level, setLevel] = useState(null)
  const [trackers, setTrackers] = useState(initialLevelTrackers)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [subdomain, setSubdomain] = useState(null)
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

  function handleConfidence(key) {
    const startLevel = PLACEMENT_CONFIDENCE_LEVELS[key]
    setLevel(startLevel)
    setTrackers(initialLevelTrackers())
    setSubdomain(pickPlacementSubdomain(startLevel))
    setView('question')
  }

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
    const result = applyPlacementAnswer(level, trackers, correct)
    const newQuestionsAsked = questionsAsked + 1
    const newCorrectCount = correct ? correctCount + 1 : correctCount

    if (result.ended || newQuestionsAsked >= PLACEMENT_MAX_QUESTIONS) {
      setCorrectCount(newCorrectCount)
      setView('submitting')

      await supabase.rpc('submit_placement_test', {
        p_pupil_id: pupilId,
        p_level: result.level,
        p_score: newCorrectCount,
        p_total: newQuestionsAsked,
      })

      setView('done')
      return
    }

    setQuestionsAsked(newQuestionsAsked)
    setCorrectCount(newCorrectCount)
    setLevel(result.level)
    setTrackers(result.trackers)
    setSubdomain(pickPlacementSubdomain(result.level))
    setLiveCorrect(null)
    setIdk(false)
  }

  if (view === 'intro') return (
    <div className="screen placement-test-screen">
      <PlacementLogo />
      <h1>{t('placementTest.intro.title')}</h1>
      <button onClick={() => setView('confidence')}>{t('placementTest.intro.start')}</button>
    </div>
  )

  if (view === 'confidence') return (
    <div className="screen placement-test-screen">
      <PlacementLogo />
      <h1>{t('placementTest.confidence.prompt')}</h1>
      <div className="placement-confidence-options">
        {CONFIDENCE_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className="placement-confidence-option"
            onClick={() => handleConfidence(opt.key)}
          >
            <span className="placement-confidence-option-emoji">{opt.emoji}</span>
            <span className="placement-confidence-option-label">{t(`placementTest.confidence.${opt.key}`)}</span>
          </button>
        ))}
      </div>
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
          style={{ width: `${Math.min(100, ((questionsAsked + 1) / PLACEMENT_MAX_QUESTIONS) * 100)}%` }}
        />
      </div>

      <div className="insight-carousel-row">
        <div className="placement-test-side-col" aria-hidden="true" />

        <div className="insight-carousel-module-wrap">
          <InsightModule
            key={questionsAsked}
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
