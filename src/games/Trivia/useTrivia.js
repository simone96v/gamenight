// Hook principale del gioco Trivia — modello "pronto democratico".
//
// Flusso: lobby → question (15s) → reveal → (Pronto) → question → ... → final → (Pronto) → lobby
//
// Il server è la fonte di verità per:
//   - timer (question_started_at)
//   - scoring (+10 correct, -10 wrong, -5 timeout)
//   - transizioni di fase (via RPCs atomiche)
//
// Tutti (host incluso) sono giocatori: rispondono e premono "Pronto".

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useSettings } from '../../stores/useSettings'
import { useServerTimer } from '../../hooks/useServerTimer'
import {
  rpcSubmitAnswer,
  rpcTimeoutReveal,
  rpcToggleReady,
  rpcStartGame,
} from '../../lib/room'
import { shuffle } from '../../utils/deck'
import questionsAll from '../../data/questions/trivia.json'

const NUM_QUESTIONS = 10

export const useTrivia = () => {
  const players = useSession((s) => s.players)
  const mode = useSession((s) => s.mode)
  const roomCode = useSession((s) => s.roomCode)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const category = useSettings((s) => s.category)

  const isOnline = mode === 'online'

  // Server-derived timer
  const { timeLeft, isExpired } = useServerTimer(
    currentPhase === 'question' ? questionStartedAt : null,
  )

  // Track local answer optimistically (before server confirms)
  const [localAnswer, setLocalAnswer] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset local answer when round changes or phase goes back to question
  const currentRound = gameState?.current_round ?? 0
  useEffect(() => {
    setLocalAnswer(null)
    setSubmitting(false)
  }, [currentRound])

  // Current question from server state
  const currentQuestion = gameState?.current_question ?? null
  const roundResults = gameState?.round_results ?? null
  const totalQuestions = gameState?.deck?.length ?? 0
  const questionNumber = currentRound + 1

  // My player object
  const myPlayer = useMemo(
    () => players.find((p) => p.id === localPlayerId),
    [players, localPlayerId],
  )
  const myIsReady = myPlayer?.is_ready ?? false

  // Count answered players (from round_results after reveal)
  const answeredPlayerIds = useMemo(() => {
    if (!roundResults) return new Set()
    return new Set(Object.keys(roundResults))
  }, [roundResults])

  // My result for this round
  const myRoundResult = roundResults?.[localPlayerId] ?? null

  // Submit answer to server
  const submitAnswer = useCallback(
    async (chosenIndex) => {
      if (localAnswer !== null || submitting) return
      if (currentPhase !== 'question') return
      if (!isOnline) return

      setLocalAnswer(chosenIndex)
      setSubmitting(true)

      const { error } = await rpcSubmitAnswer(roomCode, localPlayerId, currentRound, chosenIndex)
      if (error) {
        console.error('[useTrivia] submitAnswer error:', error)
        setLocalAnswer(null)
        useSession.getState().showError('generic')
      }
      setSubmitting(false)
    },
    [localAnswer, submitting, currentPhase, isOnline, roomCode, localPlayerId, currentRound],
  )

  // Auto-reveal on timeout: any client can fire this (idempotent)
  const timeoutFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'question') {
      timeoutFiredRef.current = false
      return
    }
    if (!isExpired || timeoutFiredRef.current) return
    timeoutFiredRef.current = true
    // Fire and forget — idempotent, safe to call from multiple clients
    rpcTimeoutReveal(roomCode, currentRound).catch((err) =>
      console.error('[useTrivia] timeoutReveal error:', err),
    )
  }, [isExpired, currentPhase, roomCode, currentRound])

  // Toggle ready (host incluso — tutti sono giocatori)
  const toggleReady = useCallback(async () => {
    if (!isOnline) return
    const { data, error } = await rpcToggleReady(roomCode, localPlayerId)
    if (error) {
      console.error('[useTrivia] toggleReady error:', error)
      useSession.getState().showError('generic')
      return
    }
    // If all_ready in lobby → generate deck and start game
    if (data?.action === 'start_game') {
      const filtered = questionsAll.filter((q) => q.category === category)
      const pool = filtered.length >= NUM_QUESTIONS ? filtered : questionsAll
      const shuffled = shuffle([...pool])
      const deck = shuffled.slice(0, NUM_QUESTIONS).map((q) => ({
        question: q.question,
        answers: q.answers,
        correct: q.correct,
      }))
      const { error: startErr } = await rpcStartGame(roomCode, deck)
      if (startErr) {
        console.error('[useTrivia] startGame error:', startErr)
      }
    }
  }, [isOnline, roomCode, localPlayerId, category])

  // Ready counts for display (tutti i giocatori, host incluso)
  const readyCounts = useMemo(() => {
    const readyPlayers = players.filter((p) => p.is_ready)
    return { ready: readyPlayers.length, total: players.length }
  }, [players])

  // Has more questions?
  const hasMoreQuestions = questionNumber < totalQuestions

  return {
    // State
    currentPhase,
    currentQuestion,
    currentRound,
    questionNumber,
    totalQuestions,
    hasMoreQuestions,
    players,
    roundResults,
    gameState,
    isOnline,
    isHost,
    localPlayerId,
    myPlayer,
    myIsReady,
    myRoundResult,
    localAnswer,
    submitting,

    // Timer
    timeLeft,
    isExpired,

    // Ready
    readyCounts,
    toggleReady,

    // Actions
    submitAnswer,
  }
}
