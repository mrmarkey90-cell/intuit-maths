import { useTranslation } from '../i18n/LanguageContext'

// Logo is a 2x2 grid of image paths -- Pelmanism's logo reuses its own
// card-back art 4-up as a simple "deck" icon. Future games each bring
// their own 4 images (or fewer, repeated) here.
const GAMES = [
  {
    id: 'pelmanism',
    name: 'Pelmanism',
    logo: Array(4).fill('/games/pelmanism/card-back.svg'),
  },
  {
    id: 'whack-a-mole',
    name: 'Whack-a-Mole',
    logo: Array(4).fill('/games/whack-a-mole/mole-alive.svg'),
  },
]

// Tile-select screen behind the Hub's Games tile -- currently one game,
// but built as a grid so adding the next one is just another GAMES entry.
function GamesHub({ onSelect, onBack }) {
  const { t } = useTranslation()

  return (
    <div className="screen games-hub-screen">
      <h1>{t('pupilHub.games')}</h1>
      <div className="games-hub-grid">
        {GAMES.map(game => (
          <button key={game.id} className="games-hub-tile" onClick={() => onSelect(game.id)}>
            <span className="games-hub-tile-logo">
              {game.logo.map((src, i) => (
                <img key={i} src={src} alt="" />
              ))}
            </span>
            <span className="games-hub-tile-name">{game.name}</span>
          </button>
        ))}
      </div>
      <button className="button-secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
  )
}

export default GamesHub
