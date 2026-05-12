// Schermata che monta il componente gioco.
// Il gioco gestisce internamente le sue fasi (countdown, question, reveal, final).
// Nessun header esterno — il gioco ha il proprio HUD.

import { Suspense, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/ui/Spinner'
import { getGame } from '../data/games'

const GameScreen = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = getGame(gameId)

  useEffect(() => {
    if (!game) navigate('/lobby', { replace: true })
  }, [game, navigate])

  if (!game) return null

  const GameComponent = game.component

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <ErrorBanner />
      <div className="screen-body" style={{ padding: 0 }}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center" style={{ flex: 1 }}>
              <Spinner size="lg" />
            </div>
          }
        >
          <GameComponent />
        </Suspense>
      </div>
    </motion.div>
  )
}

export default GameScreen
