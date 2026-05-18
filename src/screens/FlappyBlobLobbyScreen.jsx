// Lobby Flappy Blob — solo single player (multiplayer rimosso, endless game).

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import FlappyBlobLeaderboard from '../games/FlappyBlob/components/FlappyBlobLeaderboard'
import { useSession } from '../stores/useSession'

const FlappyBlobLobbyScreen = () => {
  const navigate = useNavigate()
  const players = useSession((s) => s.players)
  const showError = useSession((s) => s.showError)

  const [launching, setLaunching] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)

  const handleStart = useCallback(async () => {
    if (launching) return
    setLaunching(true)
    try {
      const seed = Math.floor(Math.random() * 2147483647)
      const now = new Date().toISOString()
      const s = useSession.getState()

      useSession.setState({
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        gameState: {
          ...(s.gameState || {}),
          currentSeed: seed,
        },
        currentPhase: 'flappyblob_countdown',
        questionStartedAt: now,
        activeGame: 'flappyblob',
      })
      navigate('/game/flappyblob', { replace: true })
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [launching, showError, navigate])

  const handleBack = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  return (
    <>
      <GameLobbyLayout
        gameName="Flappy Blob"
        gameDescription="Tap per far volare il blob fra i tubi. Un colpo e sei fuori."
        players={players}
        canControl={true}
        launching={launching}
        onStart={handleStart}
        onBack={handleBack}
        headerActions={
          <IconButton ariaLabel="Classifica globale" onClick={() => setLbOpen(true)}>🏆</IconButton>
        }
      />
      <FlappyBlobLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
    </>
  )
}

export default FlappyBlobLobbyScreen
