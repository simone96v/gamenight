import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GameLobbyLayout from '../components/GameLobbyLayout'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { loadMappaDeck, preloadMappaPool, MAPPA_DIFFICULTIES } from '../lib/mappaDeck'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const ROUND_OPTIONS = [5, 10, 25, 50]

const MappaLobbyScreen = () => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const savedRounds = gameState?.mappaRounds ?? 10
  const savedDifficulty = gameState?.mappaDifficulty ?? 'mix'
  const [rounds, setRounds] = useState(savedRounds)
  const [difficulty, setDifficulty] = useState(savedDifficulty)
  const [launching, setLaunching] = useState(false)

  useEffect(() => { preloadMappaPool() }, [])

  const syncSetting = useCallback((patch) => {
    if (!canControl) return
    const s = useSession.getState()
    const newGameState = { ...s.gameState, ...patch }
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
  }, [canControl])

  const syncRounds = (val) => { setRounds(val); syncSetting({ mappaRounds: val }) }
  const syncDifficulty = (val) => { setDifficulty(val); syncSetting({ mappaDifficulty: val }) }

  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)

    try {
      const deck = await loadMappaDeck(rounds, difficulty)
      const now = new Date().toISOString()
      const s = useSession.getState()
      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'mappa',
        selectedGame: 'mappa',
        deck,
        current_round: 0,
        current_question: deck[0],
        pins: {},
        timer_duration: 30,
        mappaRounds: rounds,
        mappaDifficulty: difficulty,
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'mappa_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
      }

      useSession.setState({
        players: fullState.players,
        gameState: {
          deck,
          current_round: 0,
          current_question: deck[0],
          pins: {},
          timer_duration: 30,
          mappaRounds: rounds,
        },
        currentPhase: 'mappa_countdown',
        questionStartedAt: now,
        activeGame: 'mappa',
      })
      navigate('/game/mappa', { replace: true })
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [canControl, launching, rounds, difficulty, showError, navigate])

  const handleBack = useCallback(() => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
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
    if (s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  return (
    <GameLobbyLayout
      gameEmoji="🗺️"
      gameName="Indovina Dove"
      gameDescription="Piazza il pin sulla mappa d'Italia! Più sei vicino, più punti fai."
      players={players}
      canControl={canControl}
      launching={launching}
      startLabel="Inizia!"
      onStart={handleStart}
      onBack={handleBack}
    >
      {/* Domande */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={settingsCard}
      >
        <span style={settingLabel}>Quante domande?</span>
        <div style={optionsRow}>
          {ROUND_OPTIONS.map((n) => (
            <motion.button
              key={n}
              type="button"
              onClick={() => canControl && syncRounds(n)}
              disabled={!canControl}
              whileHover={canControl ? { y: -2 } : undefined}
              whileTap={canControl ? { y: 0, scale: 0.95 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                ...optionBtn,
                background: rounds === n ? C.accent : 'var(--surface)',
                color: rounds === n ? '#fff' : 'var(--text)',
                border: rounds === n ? `2px solid ${C.accent}` : '2px solid var(--border)',
                boxShadow: rounds === n ? `0 4px 12px ${C.shadow}` : '0 2px 6px rgba(0,0,0,0.04)',
                opacity: !canControl ? 0.6 : 1,
                cursor: canControl ? 'pointer' : 'default',
              }}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Difficoltà */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        style={settingsCard}
      >
        <span style={settingLabel}>Difficoltà</span>
        <div style={optionsRow}>
          {MAPPA_DIFFICULTIES.map((d) => {
            const active = d.id === difficulty
            return (
              <motion.button
                key={d.id}
                type="button"
                onClick={() => canControl && syncDifficulty(d.id)}
                disabled={!canControl}
                whileHover={canControl ? { y: -2 } : undefined}
                whileTap={canControl ? { y: 0, scale: 0.95 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  ...optionBtn,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 'clamp(12px, 1.5dvh, 14px)',
                  background: active ? d.color : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? `2px solid ${d.color}` : '2px solid var(--border)',
                  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                  opacity: !canControl ? 0.6 : 1,
                  cursor: canControl ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 14 }}>{d.emoji}</span>
                <span>{d.label}</span>
              </motion.button>
            )
          })}
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

export default MappaLobbyScreen
