import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { haptic } from '../../utils/haptic'

// CatchBlob è sempre endless (1 errore = morto). roundDuration = 0 disattiva
// il timer; la round termina quando tutti i player sono morti.
const ROUND_DURATION = 0

export const useCatchBlob = () => {
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

  const timerActive = roundDuration > 0 && currentPhase === 'catchblob_playing'
  const { timeLeft, isExpired: _isExpired } = useServerTimer(
    timerActive ? questionStartedAt : null,
    roundDuration || 9999,
  )
  const isExpired = roundDuration > 0 ? _isExpired : false

  const currentSeed = gameState?.currentSeed ?? 0
  const currentRoundIdx = gameState?.currentRoundIdx ?? 0
  const totalRounds = gameState?.totalRounds ?? 1
  const roundScores = gameState?.roundScores ?? {}
  const totalScores = gameState?.totalScores ?? {}

  const [advancing, setAdvancing] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAdvancing(false); setScoreSubmitted(false) }, [currentRoundIdx])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAdvancing(false) }, [currentPhase])

  // Host: countdown → playing
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'catchblob_countdown') {
      countdownFiredRef.current = false
      return
    }
    if (!isHost || countdownFiredRef.current) return
    countdownFiredRef.current = true
    setPhaseWithTimer('catchblob_playing')
  }, [currentPhase, isHost, setPhaseWithTimer])

  // Submit del punteggio finale al game over.
  const submitScore = useCallback((score) => {
    if (scoreSubmitted) return
    setScoreSubmitted(true)
    haptic.medium()

    if (isOnline) {
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

  // Live score update per la classifica online (throttled).
  const lastPeriodicRef = useRef(0)
  const updateScorePeriodic = useCallback((score) => {
    const now = Date.now()
    if (now - lastPeriodicRef.current < 5000) return
    lastPeriodicRef.current = now
    if (isOnline) {
      castVote('roundScores', score)
    }
  }, [isOnline, castVote])

  // Host: results quando il timer scade (caso edge: solo se roundDuration > 0).
  const timerResultsRef = useRef(false)
  const timerResultsTimeoutRef = useRef(null)
  useEffect(() => {
    if (currentPhase !== 'catchblob_playing') {
      timerResultsRef.current = false
      if (timerResultsTimeoutRef.current) {
        clearTimeout(timerResultsTimeoutRef.current)
        timerResultsTimeoutRef.current = null
      }
      return
    }
    if (!isHost || !isExpired || timerResultsRef.current) return
    timerResultsRef.current = true
    timerResultsTimeoutRef.current = setTimeout(() => {
      timerResultsTimeoutRef.current = null
      const s = useSession.getState()
      const scores = s.gameState?.roundScores ?? {}
      const finished = s.gameState?.roundFinished ?? {}
      const finalScores = {}
      const finalFinished = { ...finished }
      s.players.forEach((p) => {
        finalScores[p.id] = scores[p.id] ?? 0
        finalFinished[p.id] = true
      })
      setGameState({ roundScores: finalScores, roundFinished: finalFinished })
      setPhase('catchblob_results')
    }, 1500)
  }, [currentPhase, isHost, isExpired, setGameState, setPhase])

  // Host: results anticipati quando tutti i player sono morti.
  const allSubmittedRef = useRef(false)
  const earlyResultsTimeoutRef = useRef(null)
  useEffect(() => {
    if (currentPhase !== 'catchblob_playing') {
      allSubmittedRef.current = false
      if (earlyResultsTimeoutRef.current) {
        clearTimeout(earlyResultsTimeoutRef.current)
        earlyResultsTimeoutRef.current = null
      }
      return
    }
    if (!isHost || allSubmittedRef.current) return
    const finished = gameState?.roundFinished ?? {}
    const allFinished = players.length > 0 && players.every((p) => finished[p.id])
    if (!allFinished) return
    allSubmittedRef.current = true
    earlyResultsTimeoutRef.current = setTimeout(() => {
      earlyResultsTimeoutRef.current = null
      setPhase('catchblob_results')
    }, 800)
  }, [currentPhase, isHost, gameState?.roundFinished, players, setPhase])

  useEffect(() => () => {
    if (timerResultsTimeoutRef.current) clearTimeout(timerResultsTimeoutRef.current)
    if (earlyResultsTimeoutRef.current) clearTimeout(earlyResultsTimeoutRef.current)
  }, [])

  const hostAdvance = useCallback(() => {
    if (!isHost || advancing) return
    setAdvancing(true)

    const s = useSession.getState()
    const scores = s.gameState?.roundScores ?? {}
    const prevTotals = s.gameState?.totalScores ?? {}
    const newTotals = { ...prevTotals }
    s.players.forEach((p) => {
      newTotals[p.id] = (prevTotals[p.id] ?? 0) + (scores[p.id] ?? 0)
    })

    const updatedPlayers = s.players.map((p) => ({
      ...p,
      score: newTotals[p.id] ?? 0,
    }))
    useSession.setState({ players: updatedPlayers })

    const nextRound = (s.gameState?.currentRoundIdx ?? 0) + 1
    if (nextRound >= (s.gameState?.totalRounds ?? 1)) {
      setGameState({ totalScores: newTotals, currentRoundIdx: nextRound })
      setPhase('catchblob_final')
    } else {
      const newSeed = Math.floor(Math.random() * 2147483647)
      setGameState({
        totalScores: newTotals,
        currentRoundIdx: nextRound,
        currentSeed: newSeed,
        roundScores: {},
        roundFinished: {},
      })
      setPhaseWithTimer('catchblob_countdown')
    }
  }, [isHost, advancing, setGameState, setPhase, setPhaseWithTimer])

  const goToClassifica = useCallback(() => {
    const s = useSession.getState()
    const scores = s.gameState?.roundScores ?? {}
    const prevTotals = s.gameState?.totalScores ?? {}
    const newTotals = { ...prevTotals }
    s.players.forEach((p) => {
      newTotals[p.id] = (prevTotals[p.id] ?? 0) + (scores[p.id] ?? 0)
    })
    const updatedPlayers = s.players.map((p) => ({
      ...p,
      score: newTotals[p.id] ?? 0,
    }))
    useSession.setState({ players: updatedPlayers })
    setGameState({ totalScores: newTotals, currentRoundIdx: (s.gameState?.currentRoundIdx ?? 0) + 1 })
    setPhase('catchblob_final')
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
