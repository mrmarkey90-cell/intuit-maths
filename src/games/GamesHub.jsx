import { useTranslation } from '../i18n/LanguageContext'

const GAMES = [
  {
    id: 'pelmanism',
    name: 'Pelmanism',
    logo: '/games/pelmanism/card-back.svg',
  },
  {
    id: 'whack-a-mole',
    name: 'Whack-a-Mole',
    logo: '/games/whack-a-mole/mole-alive.svg',
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
            <img className="games-hub-tile-logo" src={game.logo} alt="" />
            <span className="games-hub-tile-name">{game.name}</span>
          </button>
        ))}
      </div>
      <button className="button-secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
  )
}

export default GamesHub
