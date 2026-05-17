import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GameLobbyLayout from '../components/GameLobbyLayout'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { initSentenzaState } from '../games/Sentenza/useSentenza'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const ROUND_OPTIONS = [5, 8, 12]

const SentenzaLobbyScreen = () => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const savedRounds = gameState?.sentenzaRounds ?? 8
  const [rounds, setRounds] = useState(savedRounds)
  const [launching, setLaunching] = useState(false)

  const syncRounds = useCallback((val) => {
    setRounds(val)
    if (!isHost) return
    const s = useSession.getState()
    const newGameState = { ...s.gameState, sentenzaRounds: val }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
  }, [isHost])

  const handleStart = useCallback(async () => {
    if (!isHost || launching) return
    setLaunching(true)

    try {
      const s = useSession.getState()
      const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
      const sentenzaState = initSentenzaState(resetPlayers, rounds)
      const now = new Date().toISOString()

      if (s.mode === 'online' && s.roomCode) {
        const fullState = {
          players: resetPlayers,
          currentIdx: 0,
          round: 0,
          activeGame: 'sentenza',
          selectedGame: 'sentenza',
          sentenzaRounds: rounds,
          ...sentenzaState,
        }
        const pushRes = await pushRoom(s.roomCode, 'sentenza_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
      }

      useSession.setState({
        players: resetPlayers,
        gameState: { ...sentenzaState, sentenzaRounds: rounds },
        currentPhase: 'sentenza_countdown',
        questionStartedAt: now,
        activeGame: 'sentenza',
      })
      navigate('/game/sentenza', { replace: true })
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [isHost, launching, rounds, showError, navigate])

  const handleBack = useCallback(() => {
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const s = useSession.getState()
    const fullState = {
      players: s.players,
      currentIdx: s.currentIdx,
      round: s.round,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const tooFew = players.length < 3

  return (
    <GameLobbyLayout
      gameEmoji="⚖️"
      gameName="Sentenza"
      gameDescription="Completa la frase con la carta più assurda. Il Giudice sceglie la migliore."
      players={players}
      canControl={isHost}
      launching={launching}
      disabled={tooFew}
      startLabel="Inizia!"
      onStart={handleStart}
      onBack={handleBack}
      warning={tooFew ? '⚠️ Servono almeno 3 giocatori per Sentenza' : undefined}
    >
      {/* Round settings */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={settingsCard}
      >
        <span style={settingLabel}>Quanti round?</span>
        <div style={optionsRow}>
          {ROUND_OPTIONS.map((n) => (
            <motion.button
              key={n}
              type="button"
              onClick={() => isHost && syncRounds(n)}
              disabled={!isHost}
              whileHover={isHost ? { y: -2 } : undefined}
              whileTap={isHost ? { y: 0, scale: 0.95 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                ...optionBtn,
                background: rounds === n ? C.accent : 'var(--surface)',
                color: rounds === n ? '#fff' : 'var(--text)',
                border: rounds === n ? `2px solid ${C.accent}` : '2px solid var(--border)',
                boxShadow: rounds === n
                  ? `0 4px 12px ${C.shadow}`
                  : '0 2px 6px rgba(0,0,0,0.04)',
                opacity: !isHost ? 0.6 : 1,
                cursor: isHost ? 'pointer' : 'default',
              }}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </GameLobbyLayout>
  )
}

const settingsCard = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'clamp(16px, 2.5dvh, 24px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}
const settingLabel = {
  fontSize: 'clamp(14px, 1.8dvh, 17px)',
  fontWeight: 800,
  color: 'var(--text)',
}
const optionsRow = {
  display: 'flex',
  gap: 10,
}
const optionBtn = {
  flex: 1,
  padding: 'clamp(12px, 2dvh, 18px) 0',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'clamp(16px, 2dvh, 20px)',
  fontWeight: 900,
  transition: 'all 0.2s',
}

export default SentenzaLobbyScreen
