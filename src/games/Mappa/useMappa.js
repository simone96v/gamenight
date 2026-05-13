import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { haptic } from '../../utils/haptic'
import { haversine, calcScore } from './geo'

const MAPPA_TIMER = 30

export const useMappa = () => {
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
  const timerDuration = gameState?.timer_duration ?? MAPPA_TIMER

  const { timeLeft, isExpired } = useServerTimer(
    currentPhase === 'mappa_question' ? questionStartedAt : null,
    timerDuration,
  )

  const currentQuestion = gameState?.current_question ?? null
  const currentRound = gameState?.current_round ?? 0
  const deck = gameState?.deck ?? []
  const totalQuestions = deck.length || 10
  const questionNumber = currentRound + 1
  const pins = gameState?.pins ?? {}

  const [localPin, setLocalPin] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    setLocalPin(null)
    setConfirmed(false)
    setAdvancing(false)
  }, [currentRound])

  useEffect(() => {
    setAdvancing(false)
  }, [currentPhase])

  // Reconnection recovery: restore pin state from server if already submitted
  const recoveredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'mappa_question' || confirmed || recoveredRef.current) return
    const myPin = pins[localPlayerId]
    if (myPin) {
      setLocalPin({ lat: myPin.lat, lng: myPin.lng })
      setConfirmed(true)
      recoveredRef.current = true
    }
  }, [currentPhase, confirmed, pins, localPlayerId])

  useEffect(() => {
    recoveredRef.current = false
  }, [currentRound])

  const placePin = useCallback((lat, lng) => {
    if (confirmed || isExpired) return
    setLocalPin({ lat, lng })
    haptic.light()
  }, [confirmed, isExpired])

  const submitPin = useCallback((pinData) => {
    if (isOnline) {
      castVote('pins', pinData)
    } else {
      const { gameState: gs, localPlayerId: pid } = useSession.getState()
      const key = pid ?? 'local'
      setGameState({ pins: { ...(gs?.pins ?? {}), [key]: pinData } })
    }
  }, [isOnline, castVote, setGameState])

  const confirmPin = useCallback(() => {
    if (!localPin || confirmed) return
    setConfirmed(true)
    haptic.medium()
    submitPin({ lat: localPin.lat, lng: localPin.lng, submittedAt: new Date().toISOString() })
  }, [localPin, confirmed, submitPin])

  // Auto-submit on timeout
  const timeoutFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'mappa_question') {
      timeoutFiredRef.current = false
      return
    }
    if (!isExpired || timeoutFiredRef.current || confirmed) return
    timeoutFiredRef.current = true
    setConfirmed(true)
    haptic.heavy()
    if (localPin) {
      submitPin({ lat: localPin.lat, lng: localPin.lng, auto: true, submittedAt: new Date().toISOString() })
    }
  }, [isExpired, currentPhase, confirmed, localPin, submitPin])

  // Host: auto-reveal when timer expires
  const revealFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'mappa_question') {
      revealFiredRef.current = false
      return
    }
    if (!isHost || !isExpired || revealFiredRef.current) return
    revealFiredRef.current = true
    const t = setTimeout(() => setPhase('mappa_reveal'), 1200)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, isExpired, setPhase])

  // Host: early reveal when all players submitted
  const allSubmittedRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'mappa_question') {
      allSubmittedRef.current = false
      return
    }
    if (!isHost || allSubmittedRef.current) return
    const allPins = gameState?.pins ?? {}
    const allSubmitted = players.length > 0 && players.every((p) => allPins[p.id])
    if (!allSubmitted) return
    allSubmittedRef.current = true
    const t = setTimeout(() => setPhase('mappa_reveal'), 800)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, gameState?.pins, players, setPhase])

  // Countdown → question (host only)
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'mappa_countdown') {
      countdownFiredRef.current = false
      return
    }
    if (!isHost || countdownFiredRef.current) return

    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const elapsed = (Date.now() - startMs) / 1000
    const delay = Math.max(0, 4 - elapsed) * 1000

    const timer = setTimeout(() => {
      if (countdownFiredRef.current) return
      countdownFiredRef.current = true
      setPhaseWithTimer('mappa_question')
    }, delay)

    return () => clearTimeout(timer)
  }, [currentPhase, isHost, questionStartedAt, setPhaseWithTimer])

  const hostAdvance = useCallback(() => {
    if (!isHost || advancing) return
    setAdvancing(true)

    const s = useSession.getState()
    const question = s.gameState?.current_question
    const answer = question?.answer
    const allPins = s.gameState?.pins ?? {}
    const dk = s.gameState?.deck ?? []
    const rd = s.gameState?.current_round ?? 0

    try {
      if (answer && typeof answer.lat === 'number' && typeof answer.lng === 'number') {
        s.players.forEach((p) => {
          const pin = allPins[p.id]
          if (!pin || typeof pin.lat !== 'number' || typeof pin.lng !== 'number') return
          const dist = haversine(pin.lat, pin.lng, answer.lat, answer.lng)
          if (!isFinite(dist)) return
          const pts = calcScore(dist)
          if (pts > 0) useSession.getState().addScore(p.id, pts)
        })
      }
    } catch (e) {
      console.error('[mappa] scoring error:', e)
    }

    const nextRound = rd + 1
    if (nextRound >= dk.length) {
      setGameState({ current_round: nextRound, pins: {} })
      setPhase('mappa_final')
    } else {
      setGameState({
        current_round: nextRound,
        current_question: dk[nextRound],
        pins: {},
      })
      setPhaseWithTimer('mappa_countdown')
    }

  }, [isHost, advancing, setGameState, setPhase, setPhaseWithTimer])

  const hasMoreQuestions = questionNumber < totalQuestions

  return {
    currentPhase,
    questionStartedAt,
    currentQuestion,
    currentRound,
    questionNumber,
    totalQuestions,
    hasMoreQuestions,
    players,
    isOnline,
    isHost,
    localPlayerId,
    localPin,
    confirmed,
    advancing,
    pins,
    timeLeft,
    isExpired,
    timerDuration,
    gameState,
    placePin,
    confirmPin,
    hostAdvance,
  }
}
