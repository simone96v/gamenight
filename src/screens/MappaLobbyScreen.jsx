import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { loadMappaDeck, preloadMappaPool, MAPPA_DIFFICULTIES } from '../lib/mappaDeck'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const ROUND_OPTIONS = [5, 10, 25, 50]
// Difficoltà stripped (niente emoji/colore) per usare lo stile flat di Movie Quiz.
const DIFFICULTY_OPTIONS = MAPPA_DIFFICULTIES.map(({ id, label }) => ({ id, label }))

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
      gameName="Indovina Dove"
      gameDescription="Piazza il pin sulla mappa d'Italia! Più sei vicino, più punti fai."
      players={players}
      canControl={canControl}
      launching={launching}
      startLabel="Inizia!"
      onStart={handleStart}
      onBack={handleBack}
    >
      <LobbySegmented
        label="Quante domande?"
        options={ROUND_OPTIONS}
        value={rounds}
        onChange={syncRounds}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl}
      />
      <LobbySegmented
        label="Difficoltà"
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={syncDifficulty}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl}
      />
    </GameLobbyLayout>
  )
}

export default MappaLobbyScreen
