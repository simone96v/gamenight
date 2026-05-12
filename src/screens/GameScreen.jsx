import { Suspense, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/ui/Spinner'
import { getGame } from '../data/games'
import { useSession } from '../stores/useSession'

const GameScreen = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = getGame(gameId)
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const endGame = useSession((s) => s.endGame)

  useEffect(() => {
    if (!game) navigate('/hub', { replace: true })
  }, [game, navigate])

  if (!game) return null

  const GameComponent = game.component
  const isOnline = mode === 'online'
  const canWrite = mode === 'local' || isHost

  const handleEnd = (result) => {
    endGame(result)
    navigate('/round-end')
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
      <div className="screen-body" style={{ padding: 0 }}>
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center"
              style={{ flex: 1 }}
            >
              <Spinner size="lg" />
            </div>
          }
        >
          <GameComponent
            onEnd={handleEnd}
            isOnline={isOnline}
            canWrite={canWrite}
            localPlayerId={localPlayerId}
          />
        </Suspense>
      </div>
    </motion.div>
  )
}

export default GameScreen
