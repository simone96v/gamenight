// Lobby Blob Dash — solo single player, endless game.

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import BlobDashLeaderboard from '../games/BlobDash/components/BlobDashLeaderboard'
import { useSession } from '../stores/useSession'

const BlobDashLobbyScreen = () => {
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
        currentPhase: 'blobdash_countdown',
        questionStartedAt: now,
        activeGame: 'blobdash',
      })
      navigate('/game/blobdash', { replace: true })
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
        gameName="Blob Dash"
        gameDescription="Corri e schiva! Endless: il blob sfreccia avanti, tap per saltare gli ostacoli."
        players={players}
        canControl={true}
        launching={launching}
        onStart={handleStart}
        onBack={handleBack}
        headerActions={
          <IconButton ariaLabel="Classifica globale" onClick={() => setLbOpen(true)}>🏆</IconButton>
        }
      />
      <BlobDashLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
    </>
  )
}

export default BlobDashLobbyScreen
