import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import CatchBlobLeaderboard from '../games/CatchBlob/components/CatchBlobLeaderboard'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'

const CatchBlobLobbyScreen = () => {
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const [launching, setLaunching] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)

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
        activeGame: 'catchblob',
        selectedGame: 'catchblob',
        currentSeed: seed,
        currentRoundIdx: 0,
        totalRounds: 1,
        roundDuration: 0,
        roundScores: {},
        roundFinished: {},
        totalScores: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'catchblob_countdown', fullState, now)
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
        currentPhase: 'catchblob_countdown',
        questionStartedAt: now,
        activeGame: 'catchblob',
      })
      navigate('/game/catchblob', { replace: true })
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
    <>
      <GameLobbyLayout
        gameName="Catch The Blob"
        gameDescription="Acchiappa i blob del tuo colore col cesto. Sbagli? Sei fuori."
        players={players}
        canControl={canControl}
        launching={launching}
        onStart={handleStart}
        onBack={handleBack}
        headerActions={
          <IconButton ariaLabel="Classifica globale" onClick={() => setLbOpen(true)}>🏆</IconButton>
        }
      />
      <CatchBlobLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
    </>
  )
}

export default CatchBlobLobbyScreen
