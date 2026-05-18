// GameCategoryScreen — scelta categoria di gioco.
// Online: SOLO l'host può scegliere; gli altri vedono "Aspetta il boss".
// Solo:   click diretto, naviga a /solo/games.

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import IconButton from '../components/ui/IconButton'
import OptionCard from '../components/ui/OptionCard'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { GAME_CATEGORIES, playableCountFor } from '../data/games'
import { pushRoom } from '../lib/room'

const GameCategoryScreen = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const players = useSession((s) => s.players)
  const roomCode = useSession((s) => s.roomCode)
  const showError = useSession((s) => s.showError)
  const expr = useMiniExpr()

  const isOnline = mode === 'online'
  const canControl = !isOnline || isHost
  const [launching, setLaunching] = useState(false)

  const handlePick = useCallback(async (cat) => {
    if (launching || !canControl) return
    setLaunching(true)
    if (isOnline) {
      const s = useSession.getState()
      const fullState = {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: null,
        selectedCategory: s.gameState?.selectedCategory ?? null,
        categoryVotes: s.gameState?.categoryVotes ?? {},
        selectedGameCategory: cat.id,
        gameVotes: {},
        selectedGame: null,
      }
      const { error } = await pushRoom(roomCode, 'game_voting', fullState)
      if (error) {
        showError('generic')
        setLaunching(false)
      }
    } else {
      useSession.setState((s) => ({
        gameState: { ...s.gameState, selectedGameCategory: cat.id },
      }))
      navigate('/solo/games')
    }
  }, [launching, canControl, isOnline, roomCode, showError, navigate])

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <AppHeader
        leading={
          !isOnline ? (
            <IconButton ariaLabel="Indietro" onClick={() => navigate('/solo', { replace: true })}>
              ←
            </IconButton>
          ) : null
        }
      />
      <ErrorBanner />
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
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="xl">Scegli la categoria</GradientTitle>
            <p style={subtitle}>
              {!canControl
                ? 'Aspetta che il boss scelga... 👑'
                : 'Tocca una card per partire'}
            </p>
          </motion.div>

          {isOnline && !canControl && (
            <WaitingStrip players={players} expr={expr} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2dvh, 20px)' }}>
            {GAME_CATEGORIES.map((cat, i) => {
              const count = playableCountFor({ mode, gameCategory: cat.id })
              const noGames = count === 0
              const disabled = launching || !canControl || noGames
              const descText = noGames ? 'Presto disponibili' : cat.description
              return (
                <div key={cat.id} style={{ position: 'relative' }}>
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: '-6px -10px',
                      background: cat.bg,
                      borderRadius: 28,
                      filter: 'blur(22px)',
                      opacity: disabled ? 0.18 : 0.55,
                      transition: 'opacity 0.25s ease',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    <OptionCard
                      option={{
                        emoji: cat.emoji,
                        title: cat.label,
                        description: descText,
                        bg: cat.bg,
                        shadow: cat.shadow,
                        border: cat.border,
                        textColor: cat.textColor,
                        subtleTitle: true,
                      }}
                      index={i}
                      onClick={() => handlePick(cat)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {launching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={launchBanner}
            >
              ⚡ Categoria scelta, si va ai giochi...
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const WaitingStrip = ({ players, expr }) => {
  if (!players?.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={progressStrip}
    >
      {players.map((p) => (
        <div key={p.id} style={voterCell}>
          <div style={voterBlob}>
            <MiniBlob color={p.color} expr={expr} size={28} id={`gc-${p.id}`} />
          </div>
          <span style={voterName}>{p.name}</span>
        </div>
      ))}
    </motion.div>
  )
}

const subtitle = {
  margin: '6px 0 0',
  color: 'var(--muted)',
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 600,
}

const launchBanner = {
  textAlign: 'center',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
  padding: '14px 20px',
  color: 'var(--accent)',
  fontWeight: 800,
  fontSize: 'clamp(14px, 1.8dvh, 16px)',
  flexShrink: 0,
}

const progressStrip = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(10px, 1.5vw, 16px)',
  flexWrap: 'wrap',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  padding: 'clamp(8px, 1.2dvh, 12px) clamp(12px, 2vw, 18px)',
}

const voterCell = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 48,
}

const voterBlob = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const voterName = {
  fontSize: 11,
  maxWidth: 56,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  color: 'var(--text)',
  fontWeight: 700,
}

export default GameCategoryScreen
