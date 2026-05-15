// SoloGamesScreen — selezione gioco per modalità solo (no voting, click diretto).

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { availableGamesFor } from '../data/games'

const LOBBY_ROUTES = {
  blobjump: '/blobjump-lobby',
  mappa: '/mappa-lobby',
  trivia: '/trivia-lobby',
}

const SoloGamesScreen = () => {
  const navigate = useNavigate()
  const player = useSession((s) => s.players[0])
  const expr = useMiniExpr()

  const games = availableGamesFor({ mode: 'local', categoryId: null })

  const handlePick = useCallback((game) => {
    const route = LOBBY_ROUTES[game.id]
    if (!route) return

    // Set activeGame so lobbies know what game we're playing
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 'clamp(8px, 1.2dvh, 12px)',
              }}>
                <MiniBlob color={player.color} expr={expr} size={28} id="solo-hdr" />
                <span style={{
                  fontSize: 'clamp(13px, 1.6dvh, 16px)',
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}>{player.name}</span>
              </div>
            )}
          </motion.div>

          {/* Game cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 'clamp(10px, 1.4vw, 16px)',
              flexShrink: 0,
            }}
          >
            {games.map((g, i) => (
              <SoloGameCard
                key={g.id}
                game={g}
                index={i}
                onClick={() => handlePick(g)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const SoloGameCard = ({ game, index, onClick }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 18, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
    whileHover={{
      scale: 1.03,
      y: -4,
      boxShadow: `0 16px 36px rgba(31, 41, 55, 0.14), 0 0 0 1px var(--border) inset`,
    }}
    whileTap={{ scale: 0.97, y: 0 }}
    onClick={onClick}
    style={{
      width: '100%',
      background: 'var(--surface)',
      borderRadius: 20,
      border: '1px solid var(--border)',
      boxShadow: `0 10px 22px rgba(31, 41, 55, 0.08), 0 0 0 1px var(--border) inset`,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      textAlign: 'left',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Hero */}
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 11',
      background: game.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        pointerEvents: 'none',
        opacity: 0.6,
      }} />
      <div style={{
        position: 'absolute', top: -32, right: -32, width: 130, height: 130,
        borderRadius: '50%', background: 'rgba(255,255,255,0.22)',
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />
      <motion.div
        style={{
          fontSize: 'clamp(56px, 12vw, 84px)',
          lineHeight: 1,
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.22))',
          zIndex: 1,
        }}
      >
        {game.emoji}
      </motion.div>
    </div>

    {/* Body */}
    <div style={{
      padding: '10px 12px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}>
      <span style={{
        fontSize: 'clamp(14px, 1.8dvh, 17px)',
        fontWeight: 900,
        color: 'var(--text)',
        lineHeight: 1.2,
      }}>
        {game.name}
      </span>
      <span style={{
        fontSize: 'clamp(11px, 1.3dvh, 13px)',
        fontWeight: 700,
        color: 'var(--muted)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        🎮 1
      </span>
    </div>
  </motion.button>
)

export default SoloGamesScreen
