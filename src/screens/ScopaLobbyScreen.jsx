import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'

const ScopaLobbyScreen = () => {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    navigate('/game/scopa', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  return (
    <GameLobbyLayout
      gameEmoji="🧹"
      gameName="Scopa"
      gameDescription={'Prendi carte sommando il valore. Tavolo vuoto = SCOPA! Punti per Carte, Denari, Settebello, Primiera.'}
      players={[]}
      canControl
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default ScopaLobbyScreen
