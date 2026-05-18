// SoloGamesScreen — selezione gioco per modalità solo (click diretto, no voto).
// Filtra per la categoria scelta nello step precedente (selectedGameCategory).

import { useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import GameCard from '../components/GameCard'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { availableGamesFor, getGameCategory } from '../data/games'

const LOBBY_ROUTES = {
  blobjump: '/blobjump-lobby',
  catchblob: '/catchblob-lobby',
  flappyblob: '/flappyblob-lobby',
  blobdash: '/blobdash-lobby',
  mappa: '/mappa-lobby',
  trivia: '/trivia-lobby',
  emojiquiz: '/emojiquiz-lobby',
  logoquiz: '/logoquiz-lobby',
  scramble: '/scramble-lobby',
  setteemezzo: '/setteemezzo-lobby',
}

const SoloGamesScreen = () => {
  const navigate = useNavigate()
  const selectedGameCategory = useSession((s) => s.gameState?.selectedGameCategory)
  const theme = useSettings((s) => s.theme)

  // Senza categoria selezionata → torna allo step categoria.
  useEffect(() => {
    if (!selectedGameCategory) navigate('/solo/category', { replace: true })
  }, [selectedGameCategory, navigate])

  const category = getGameCategory(selectedGameCategory)
  const games = availableGamesFor({
    mode: 'local',
    categoryId: null,
    gameCategory: selectedGameCategory,
  })

  const handlePick = useCallback((game) => {
    if (game.locked) return
    const route = LOBBY_ROUTES[game.id]
    if (!route) return

    useSession.setState((s) => ({
      activeGame: game.id,
      gameState: { ...s.gameState, selectedGame: game.id },
    }))

    navigate(route)
  }, [navigate])

  if (!selectedGameCategory) return null

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader
        leading={
          <IconButton ariaLabel="Indietro" onClick={() => navigate('/solo/category', { replace: true })}>
            ←
          </IconButton>
        }
      />

      <div
        className="screen-body"
        style={{
          gap: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          padding: 'clamp(12px, 2dvh, 24px) clamp(14px, 4vw, 48px) clamp(24px, 4dvh, 40px)',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(14px, 2dvh, 22px)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="md">
              {category ? `${category.emoji} ${category.label}` : 'Scegli il gioco'}
            </GradientTitle>
          </motion.div>

          <div style={grid}>
            {games.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                index={i}
                onClick={() => handlePick(g)}
                mode="solo"
                theme={theme}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'clamp(10px, 1.4vw, 16px)',
  flexShrink: 0,
}

export default SoloGamesScreen
