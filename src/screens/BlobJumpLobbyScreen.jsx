import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'

const BlobJumpLobbyScreen = () => {
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)

    try {
      const seed = Math.floor(Math.random() * 2147483647)
      const now = new Date().toISOString()
      const s = useSession.getState()

      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'blobjump',
        selectedGame: 'blobjump',
        currentSeed: seed,
        currentRoundIdx: 0,
        totalRounds: 1,
        roundDuration: 0,
        roundScores: {},
        roundFinished: {},
        totalScores: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'blobjump_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
      }

      useSession.setState({
        players: fullState.players,
        gameState: {
          currentSeed: seed,
          currentRoundIdx: 0,
          totalRounds: 1,
          roundDuration: 0,
          roundScores: {},
          roundFinished: {},
          totalScores: {},
        },
        currentPhase: 'blobjump_countdown',
        questionStartedAt: now,
        activeGame: 'blobjump',
      })
      navigate('/game/blobjump', { replace: true })
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [canControl, launching, showError, navigate])

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
      gameName="Blob Jump"
      gameDescription="Salta più in alto degli altri! Il tuo blob rimbalza verso il cielo."
      players={players}
      canControl={canControl}
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default BlobJumpLobbyScreen
