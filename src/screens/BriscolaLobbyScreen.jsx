import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'

const BriscolaLobbyScreen = () => {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    navigate('/game/briscola', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  return (
    <GameLobbyLayout
      gameEmoji="🃏"
      gameName="Briscola"
      gameDescription={'Trick-taking 1v1. Una briscola comanda su tutti. Vince chi supera 60 punti su 120.'}
      players={[]}
      canControl
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default BriscolaLobbyScreen
