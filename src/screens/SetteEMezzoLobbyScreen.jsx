// Lobby Sette e Mezzo — solo single player (vs banco).
// Minima: descrizione regole + bottone Inizia.

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'

const SetteEMezzoLobbyScreen = () => {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(() => {
    if (launching) return
    setLaunching(true)
    navigate('/game/setteemezzo', { replace: true })
  }, [launching, navigate])

  const handleBack = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  return (
    <GameLobbyLayout
      gameEmoji="7️⃣"
      gameName="Sette e Mezzo"
      gameDescription={'Avvicinati a 7½ senza sballare. Carta o sto? Banco vince in caso di pari.'}
      players={[]}
      canControl
      launching={launching}
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default SetteEMezzoLobbyScreen
