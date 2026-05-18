// Lobby Blob Snake — solo single player (endless arcade).
// TODO: il componente `games/Snake` non è ancora stato creato — appena esiste
// ripristina l'import di SnakeLeaderboard e rimuovi lo stub qui sotto.

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import { useSession } from '../stores/useSession'

// Stub temporaneo finché Snake non è implementato.
const SnakeLeaderboard = () => null

const SnakeLobbyScreen = () => {
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
        currentPhase: 'snake_countdown',
        questionStartedAt: now,
        activeGame: 'snake',
      })
      navigate('/game/snake', { replace: true })
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
        gameName="Blob Snake"
        gameDescription="Guida il serpente di blob: divora le pillole, cresci, evita la coda e i bordi. Endless."
        players={players}
        canControl={true}
        launching={launching}
        onStart={handleStart}
        onBack={handleBack}
        headerActions={
          <IconButton ariaLabel="Classifica globale" onClick={() => setLbOpen(true)}>🏆</IconButton>
        }
      />
      <SnakeLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
    </>
  )
}

export default SnakeLobbyScreen
