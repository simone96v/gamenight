import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { haptic } from '../../utils/haptic'

// Blob Dash è single-player endless, stesso pattern di useBlobJump.
export const useBlobDash = () => {
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)

  const currentSeed = gameState?.currentSeed ?? 0

  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (currentPhase === 'blobdash_countdown' || currentPhase === 'blobdash_playing') {
      submittedRef.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScoreSubmitted(false)
    }
  }, [currentPhase])

  // Countdown → playing dopo 3 sec (overlay 3-2-1-VIA).
  useEffect(() => {
    if (currentPhase !== 'blobdash_countdown') return
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const elapsed = (Date.now() - startMs) / 1000
    const delay = Math.max(0, 4 - elapsed) * 1000
    const t = setTimeout(() => setPhaseWithTimer('blobdash_playing'), delay)
    return () => clearTimeout(t)
  }, [currentPhase, questionStartedAt, setPhaseWithTimer])

  const submitScore = useCallback((score) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setScoreSubmitted(true)
    haptic.medium()
    const s = useSession.getState()
    const pid = s.localPlayerId ?? 'local'
    const updatedPlayers = (s.players || []).map((p) =>
      p.id === pid ? { ...p, score } : p,
    )
    useSession.setState({ players: updatedPlayers })
    setPhase('blobdash_final')
  }, [setPhase])

  // Safety net come in useBlobJump.
  useEffect(() => {
    if (!scoreSubmitted) return
    if (currentPhase !== 'blobdash_playing') return
    const t = setTimeout(() => {
      const s = useSession.getState()
      if (s.currentPhase === 'blobdash_playing') {
        setPhase('blobdash_final')
      }
    }, 500)
    return () => clearTimeout(t)
  }, [scoreSubmitted, currentPhase, setPhase])

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
