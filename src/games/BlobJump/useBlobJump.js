import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { haptic } from '../../utils/haptic'

const ROUND_DURATION = 60

export const useBlobJump = () => {
  const players = useSession((s) => s.players)
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const setGameState = useSession((s) => s.setGameState)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)
  const castVote = useSession((s) => s.castVote)

  const isOnline = mode === 'online'
  const roundDuration = gameState?.roundDuration ?? ROUND_DURATION

  // roundDuration <= 0 means endless (no timer) — used in solo mode
  const timerActive = roundDuration > 0 && currentPhase === 'blobjump_playing'
  const { timeLeft, isExpired: _isExpired } = useServerTimer(
    timerActive ? questionStartedAt : null,
    roundDuration || 9999,
  )
  const isExpired = roundDuration > 0 ? _isExpired : false

  const currentSeed = gameState?.currentSeed ?? 0
  const currentRoundIdx = gameState?.currentRoundIdx ?? 0
  const totalRounds = gameState?.totalRounds ?? 3
  const roundScores = gameState?.roundScores ?? {}
  const totalScores = gameState?.totalScores ?? {}

  const [advancing, setAdvancing] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)

  // Reset local state when round/phase changes (sync with external state)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAdvancing(false); setScoreSubmitted(false) }, [currentRoundIdx])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAdvancing(false) }, [currentPhase])

  // Host: countdown → playing transition
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'blobjump_countdown') {
      countdownFiredRef.current = false
      return
    }
    if (!isHost || countdownFiredRef.current) return
    countdownFiredRef.current = true
    setPhaseWithTimer('blobjump_playing')
  }, [currentPhase, isHost, setPhaseWithTimer])

  // Submit score (called by game component on death)
  const submitScore = useCallback((score) => {
    if (scoreSubmitted) return
    setScoreSubmitted(true)
    haptic.medium()

    if (isOnline) {
      // Write final score AND mark as finished (separate fields so periodic
      // live-score updates don't trigger the "all finished" check).
      castVote('roundScores', score)
      castVote('roundFinished', true)
    } else {
      const s = useSession.getState()
      const pid = s.localPlayerId ?? 'local'
      setGameState({
        roundScores: { ...(s.gameState?.roundScores ?? {}), [pid]: score },
        roundFinished: { ...(s.gameState?.roundFinished ?? {}), [pid]: true },
      })
    }
  }, [scoreSubmitted, isOnline, castVote, setGameState])

  // Periodic score update (throttled, for live leaderboard)
  const lastPeriodicRef = useRef(0)
  const updateScorePeriodic = useCallback((score) => {
    const now = Date.now()
    if (now - lastPeriodicRef.current < 5000) return
    lastPeriodicRef.current = now
    if (isOnline) {
      castVote('roundScores', score)
    }
  }, [isOnline, castVote])

  // Host: auto-results when timer expires
  const timerResultsRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'blobjump_playing') {
      timerResultsRef.current = false
      return
    }
    if (!isHost || !isExpired || timerResultsRef.current) return
    timerResultsRef.current = true
    const t = setTimeout(() => {
      const s = useSession.getState()
      const scores = s.gameState?.roundScores ?? {}
      const finished = s.gameState?.roundFinished ?? {}
      // Players who didn't submit get 0; mark everyone as finished
      const finalScores = {}
      const finalFinished = { ...finished }
      s.players.forEach((p) => {
        finalScores[p.id] = scores[p.id] ?? 0
        finalFinished[p.id] = true
      })
      setGameState({ roundScores: finalScores, roundFinished: finalFinished })
      setPhase('blobjump_results')
    }, 1500)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, isExpired, setGameState, setPhase])

  // Host: early results when all players have died (roundFinished, NOT roundScores
  // which also gets periodic live updates).
  const allSubmittedRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'blobjump_playing') {
      allSubmittedRef.current = false
      return
    }
    if (!isHost || allSubmittedRef.current) return
    const finished = gameState?.roundFinished ?? {}
    const allFinished = players.length > 0 && players.every((p) => finished[p.id])
    if (!allFinished) return
    allSubmittedRef.current = true
    const t = setTimeout(() => setPhase('blobjump_results'), 800)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, gameState?.roundFinished, players, setPhase])

  // Host advance: next round or final
  const hostAdvance = useCallback(() => {
    if (!isHost || advancing) return
    setAdvancing(true)

    const s = useSession.getState()
    const scores = s.gameState?.roundScores ?? {}
    const prevTotals = s.gameState?.totalScores ?? {}

    // Accumulate round scores into totals
    const newTotals = { ...prevTotals }
    s.players.forEach((p) => {
      newTotals[p.id] = (prevTotals[p.id] ?? 0) + (scores[p.id] ?? 0)
    })

    // Also update player.score for the scoreboard
    const updatedPlayers = s.players.map((p) => ({
      ...p,
      score: newTotals[p.id] ?? 0,
    }))
    useSession.setState({ players: updatedPlayers })

    const nextRound = (s.gameState?.currentRoundIdx ?? 0) + 1
    if (nextRound >= (s.gameState?.totalRounds ?? 3)) {
      setGameState({ totalScores: newTotals, currentRoundIdx: nextRound })
      setPhase('blobjump_final')
    } else {
      const newSeed = Math.floor(Math.random() * 2147483647)
      setGameState({
        totalScores: newTotals,
        currentRoundIdx: nextRound,
        currentSeed: newSeed,
        roundScores: {},
        roundFinished: {},
      })
      setPhaseWithTimer('blobjump_countdown')
    }
  }, [isHost, advancing, setGameState, setPhase, setPhaseWithTimer])

  // Go directly to final classifica (used by death screen button)
  const goToClassifica = useCallback(() => {
    const s = useSession.getState()
    const scores = s.gameState?.roundScores ?? {}

    // Compute final totals
    const prevTotals = s.gameState?.totalScores ?? {}
    const newTotals = { ...prevTotals }
    s.players.forEach((p) => {
      newTotals[p.id] = (prevTotals[p.id] ?? 0) + (scores[p.id] ?? 0)
    })

    // Update player scores for the leaderboard
    const updatedPlayers = s.players.map((p) => ({
      ...p,
      score: newTotals[p.id] ?? 0,
    }))
    useSession.setState({ players: updatedPlayers })

    setGameState({ totalScores: newTotals, currentRoundIdx: (s.gameState?.currentRoundIdx ?? 0) + 1 })
    setPhase('blobjump_final')
  }, [setGameState, setPhase])

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const blobColor = localPlayer?.color ?? '#8B5CF6'

  return {
    currentPhase,
    questionStartedAt,
    players,
    isOnline,
    isHost,
    localPlayerId,
    blobColor,
    currentSeed,
    currentRoundIdx,
    totalRounds,
    roundDuration,
    roundScores,
    totalScores,
    timeLeft,
    isExpired,
    advancing,
    scoreSubmitted,
    submitScore,
    updateScorePeriodic,
    hostAdvance,
    goToClassifica,
  }
}
