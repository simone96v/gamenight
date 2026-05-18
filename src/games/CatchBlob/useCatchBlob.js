import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../../stores/useSession'
import { haptic } from '../../utils/haptic'

// Catch The Blob è single-player endless (1 errore = morto). Niente classifica
// temporanea: al death andiamo dritti a catchblob_final → modale SoloEndScreen.
export const useCatchBlob = () => {
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)

  const currentSeed = gameState?.currentSeed ?? 0

  const [scoreSubmitted, setScoreSubmitted] = useState(false)

  useEffect(() => {
    if (currentPhase === 'catchblob_countdown' || currentPhase === 'catchblob_playing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScoreSubmitted(false)
    }
  }, [currentPhase])

  // Countdown → playing dopo 3 sec (allineato all'overlay 3-2-1-VIA).
  useEffect(() => {
    if (currentPhase !== 'catchblob_countdown') return
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const elapsed = (Date.now() - startMs) / 1000
    const delay = Math.max(0, 4 - elapsed) * 1000
    const t = setTimeout(() => setPhaseWithTimer('catchblob_playing'), delay)
    return () => clearTimeout(t)
  }, [currentPhase, questionStartedAt, setPhaseWithTimer])

  const submitScore = useCallback((score) => {
    if (scoreSubmitted) return
    setScoreSubmitted(true)
    haptic.medium()
    const s = useSession.getState()
    const pid = s.localPlayerId ?? 'local'
    const updatedPlayers = (s.players || []).map((p) =>
      p.id === pid ? { ...p, score } : p,
    )
    useSession.setState({ players: updatedPlayers })
    setPhase('catchblob_final')
  }, [scoreSubmitted, setPhase])

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const blobColor = localPlayer?.color ?? '#8B5CF6'

  return {
    currentPhase,
    questionStartedAt,
    players,
    localPlayerId,
    blobColor,
    currentSeed,
    scoreSubmitted,
    submitScore,
  }
}
