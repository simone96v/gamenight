import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../../stores/useSession'
import { haptic } from '../../utils/haptic'

// Snake è single-player endless (1 collisione = morto).
// Stesso pattern di FlappyBlob/CatchBlob: countdown → playing → final con SoloEndScreen.
export const useSnake = () => {
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
    if (currentPhase === 'snake_countdown' || currentPhase === 'snake_playing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScoreSubmitted(false)
    }
  }, [currentPhase])

  // Countdown → playing dopo 3 sec (allineato all'overlay 3-2-1-VIA).
  useEffect(() => {
    if (currentPhase !== 'snake_countdown') return
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const elapsed = (Date.now() - startMs) / 1000
    const delay = Math.max(0, 4 - elapsed) * 1000
    const t = setTimeout(() => setPhaseWithTimer('snake_playing'), delay)
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
    setPhase('snake_final')
  }, [scoreSubmitted, setPhase])

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const blobColor = localPlayer?.color ?? '#14B8A6'

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
