import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Card from '../components/ui/Card'
import PlayerStrip from '../components/PlayerStrip'
import { GAMES } from '../data/games'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const GameHubScreen = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const players = useSession((s) => s.players)
  const startGame = useSession((s) => s.startGame)
  const activeGames = useSettings((s) => s.activeGames)

  const canStart = mode === 'local' || isHost
  const available = GAMES.filter((g) => activeGames.includes(g.id))

  const handleSelect = (gameId) => {
    if (!canStart) return
    startGame(gameId)
    navigate(`/game/${gameId}`)
  }

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div className="screen-body">
        <PlayerStrip players={players} />

        <h2
          className="font-bold"
          style={{ fontSize: 'clamp(18px, 3dvh, 26px)', letterSpacing: '-0.01em' }}
        >
          Scegli il gioco
        </h2>

        <motion.div
          className="scrollable-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1.5dvh, 16px)',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {available.map((game) => (
            <motion.div key={game.id} variants={itemVariants}>
              <Card onClick={canStart ? () => handleSelect(game.id) : undefined}>
                <div
                  className="flex items-center"
                  style={{ gap: 'clamp(10px, 2vw, 16px)' }}
                >
                  <span style={{ fontSize: 'clamp(28px, 5dvh, 40px)' }}>
                    {game.emoji}
                  </span>
                  <div>
                    <div
                      className="font-bold"
                      style={{ fontSize: 'clamp(16px, 2.5dvh, 22px)' }}
                    >
                      {game.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: 'clamp(13px, 1.8dvh, 15px)',
                      }}
                    >
                      {game.description}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {!canStart && (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 'clamp(13px, 1.8dvh, 15px)',
              textAlign: 'center',
            }}
          >
            In attesa che l&apos;host scelga...
          </p>
        )}
      </div>
      <div className="screen-footer" />
    </motion.div>
  )
}

export default GameHubScreen
