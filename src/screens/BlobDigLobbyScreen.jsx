import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import BlobDigLeaderboard from '../games/BlobDig/components/BlobDigLeaderboard'
import { useSession } from '../stores/useSession'

const BlobDigLobbyScreen = () => {
  const navigate = useNavigate()
  const players = useSession((s) => s.players)
  const [launching, setLaunching] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    const seed = Math.floor(Math.random() * 2147483647)
    const now = new Date().toISOString()
    const s = useSession.getState()
    useSession.setState({
      players: (s.players || []).map((p) => ({ ...p, score: 0 })),
      gameState: { currentSeed: seed },
      currentPhase: 'blobdig_countdown',
      questionStartedAt: now,
      activeGame: 'blobdig',
    })
    navigate('/game/blobdig', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  return (
    <>
      <GameLobbyLayout
        gameName="Blob Dig"
        gameDescription="Scava sempre più in profondità. Tap sinistra/destra per scegliere la cella. Evita la lava!"
        players={players}
        canControl
        launching={launching}
        onStart={handleStart}
        onBack={handleBack}
        headerActions={
          <IconButton ariaLabel="Classifica globale" onClick={() => setLbOpen(true)}>🏆</IconButton>
        }
      />
      <BlobDigLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
    </>
  )
}

export default BlobDigLobbyScreen
