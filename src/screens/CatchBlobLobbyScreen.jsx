// Lobby Catch The Blob — solo single player (multiplayer rimosso, endless game).

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import IconButton from '../components/ui/IconButton'
import CatchBlobLeaderboard from '../games/CatchBlob/components/CatchBlobLeaderboard'
import { useSession } from '../stores/useSession'

const CatchBlobLobbyScreen = () => {
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
        currentPhase: 'catchblob_countdown',
        questionStartedAt: now,
        activeGame: 'catchblob',
      })
      navigate('/game/catchblob', { replace: true })
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
        gameName="Catch The Blob"
        gameDescription="Acchiappa i blob del tuo colore, evita bombe e teschi. Endless: sopravvivi finché puoi."
        players={players}
        canControl={true}
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
