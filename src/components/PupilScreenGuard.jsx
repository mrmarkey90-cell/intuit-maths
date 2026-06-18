import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/LanguageContext'

function getIsPortrait() {
  return window.innerHeight > window.innerWidth
}

// Wraps every child-facing screen (pupil join/session/hub) with device
// chrome that only makes sense on a tablet/phone, never a teacher's
// laptop: a landscape-only gate (blocks interaction with a rotate prompt
// while portrait) and a persistent fullscreen toggle, top right.
function PupilScreenGuard({ children }) {
  const { t } = useTranslation()
  const [portrait, setPortrait] = useState(getIsPortrait())
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)
  const fullscreenSupported = !!document.fullscreenEnabled

  useEffect(() => {
    const handleResize = () => setPortrait(getIsPortrait())
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  useEffect(() => {
    const handleChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <>
      {fullscreenSupported && (
        <button
          className="fullscreen-toggle-btn"
          onClick={toggleFullscreen}
          aria-label={t(fullscreen ? 'common.exitFullscreen' : 'common.enterFullscreen')}
        >
          {fullscreen ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9V5a2 2 0 0 1 2-2h4M20 9V5a2 2 0 0 0-2-2h-4M4 15v4a2 2 0 0 0 2 2h4M20 15v4a2 2 0 0 1-2 2h-4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
            </svg>
          )}
        </button>
      )}

      {children}

      {portrait && (
        <div className="rotate-device-overlay">
          <div className="rotate-device-icon" />
          <p className="rotate-device-text">{t('common.rotateDevice')}</p>
        </div>
      )}
    </>
  )
}

export default PupilScreenGuard
