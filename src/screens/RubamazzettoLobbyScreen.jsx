import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'

const RubamazzettoLobbyScreen = () => {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    navigate('/game/rubamazzetto', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  return (
    <GameLobbyLayout
      gameEmoji="🦹"
      gameName="Rubamazzetto"
      gameDescription={'Gioca una carta. Stessa carta del mazzetto avversario? Glielo rubi. Stesso valore sul tavolo? Lo prendi. Mazzo più alto vince.'}
      players={[]}
      canControl
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default RubamazzettoLobbyScreen
