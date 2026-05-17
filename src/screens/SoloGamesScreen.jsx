// SoloGamesScreen — selezione gioco per modalità solo (click diretto, no voto).
// Stessa griglia di GamesScreen ma con GameCard in modalità 'solo'.

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import GameCard from '../components/GameCard'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { availableGamesFor } from '../data/games'

const LOBBY_ROUTES = {
  blobjump: '/blobjump-lobby',
  mappa: '/mappa-lobby',
  trivia: '/trivia-lobby',
  emojiquiz: '/emojiquiz-lobby',
  scramble: '/scramble-lobby',
}

const SoloGamesScreen = () => {
  const navigate = useNavigate()
  const player = useSession((s) => s.players[0])
  const theme = useSettings((s) => s.theme)
  const expr = useMiniExpr()

  const games = availableGamesFor({ mode: 'local', categoryId: null })

  const handlePick = useCallback((game) => {
    const route = LOBBY_ROUTES[game.id]
    if (!route) return

    useSession.setState((s) => ({
      activeGame: game.id,
      gameState: { ...s.gameState, selectedGame: game.id },
    }))

    navigate(route)
  }, [navigate])

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader
        leading={
          <IconButton ariaLabel="Indietro" onClick={() => navigate('/solo', { replace: true })}>
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="xl">Scegli il gioco</GradientTitle>
            {player && (
              <div style={playerRow}>
                <MiniBlob color={player.color} expr={expr} size={28} id="solo-hdr" />
                <span style={playerName}>{player.name}</span>
              </div>
            )}
          </motion.div>

          {/* Grid */}
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

const playerRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 'clamp(8px, 1.2dvh, 12px)',
}
const playerName = {
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 700,
  color: 'var(--muted)',
}
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'clamp(10px, 1.4vw, 16px)',
  flexShrink: 0,
}

export default SoloGamesScreen
