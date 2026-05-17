// Schermata finale dei mini-giochi sync (NeverHaveI).
// Mostra titolo + 2 CTA: Rigioca / Cambia gioco.
// I client vedono "Aspettando il boss... 👑" finché l'host non decide.

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../stores/useSession'
import { pushRoom, rpcUpdateGameState } from '../lib/room'
import GradientTitle from './ui/GradientTitle'
import Button from './ui/Button'

const GameFinalScreen = ({ emoji, title = 'Fine!', subtitle, replayPatch }) => {
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)

  const handleReplay = async () => {
    if (!isHost) return
    await rpcUpdateGameState(roomCode, localPlayerId, replayPatch)
  }

  const handleChangeGame = async () => {
    if (!isHost) return
    setAwaitingGameChange(true)
    navigate('/games', { replace: true })
    const s = useSession.getState()
    const newGameState = {
      ...s.gameState,
      gameVotes: {},
      selectedGame: null,
    }
    const fullState = {
      players: s.players,
      currentIdx: s.currentIdx,
      round: s.round,
      activeGame: null,
      ...newGameState,
    }
    await pushRoom(roomCode, 'game_voting', fullState)
    setAwaitingGameChange(false)
  }

  return (
    <div style={S.wrap}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        style={S.card}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={S.emoji}
        >
          {emoji}
        </motion.div>
        <GradientTitle as="h2" size="lg" style={{ textAlign: 'center' }}>
          {title}
        </GradientTitle>
        {subtitle && <p style={S.sub}>{subtitle}</p>}

        {isHost ? (
          <div style={S.btnRow}>
            <Button variant="secondary" width="full" onClick={handleChangeGame}>
              Cambia gioco
            </Button>
            <Button variant="primary" width="full" onClick={handleReplay}>
              Rigioca
            </Button>
          </div>
        ) : (
          <p style={S.waiting}>👑 Aspettando il boss...</p>
        )}
      </motion.div>
    </div>
  )
}

const S = {
  wrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(16px, 4dvh, 36px) clamp(16px, 4vw, 28px)',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 'clamp(24px, 4dvh, 36px) clamp(22px, 4.5vw, 32px)',
    boxShadow: '0 20px 56px rgba(31,41,55,0.18)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(10px, 1.8dvh, 16px)',
    textAlign: 'center',
  },
  emoji: {
    fontSize: 'clamp(64px, 12vw, 90px)',
    lineHeight: 1,
    filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.30))',
  },
  sub: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 600,
    lineHeight: 1.4,
    maxWidth: 360,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  waiting: {
    margin: '8px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 700,
    padding: '12px 0',
  },
}

export default GameFinalScreen
