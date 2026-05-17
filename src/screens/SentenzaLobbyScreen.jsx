import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
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
      gameName="Sentenza"
      gameDescription="Completa la frase con la carta più assurda. Il Giudice sceglie la migliore."
      players={players}
      canControl={isHost}
      launching={launching}
      disabled={tooFew}
      onStart={handleStart}
      onBack={handleBack}
      warning={tooFew ? '⚠️ Servono almeno 3 giocatori per Sentenza' : undefined}
    >
      <LobbySegmented
        label="Quanti round?"
        options={ROUND_OPTIONS}
        value={rounds}
        onChange={syncRounds}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!isHost}
      />
    </GameLobbyLayout>
  )
}

export default SentenzaLobbyScreen
