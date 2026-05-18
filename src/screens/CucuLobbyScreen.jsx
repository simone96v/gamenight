// Lobby Cucù — solo single-player vs 3 CPU.

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'

const CucuLobbyScreen = () => {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    navigate('/game/cucu', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  return (
    <GameLobbyLayout
      gameEmoji="🐦"
      gameName="Cucù"
      gameDescription={'Tieni la carta o scambia col vicino. Re blocca lo scambio. Carta più bassa = vita persa. Sopravvivi contro 3 bot.'}
      players={[]}
      canControl
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default CucuLobbyScreen
