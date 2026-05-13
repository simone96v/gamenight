// Hook principale del gioco Trivia — modello host-controlled.
//
// Flusso: lobby → countdown (3-2-1) → question (Ns) → reveal → question → ... → final → lobby
//
// L'host controlla il ritmo: "Prossima domanda" in reveal, "Nuova partita" in final.
// Tutti i giocatori (host incluso) rispondono alle domande.
//
// Il server è la fonte di verità per timer, scoring, transizioni di fase.

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useSettings } from '../../stores/useSettings'
import { useServerTimer } from '../../hooks/useServerTimer'
import {
  rpcSubmitAnswer,
  rpcTimeoutReveal,
  rpcBeginRound,
  rpcHostAdvance,
  pushRoom,
} from '../../lib/room'
import { getCategoryById } from './constants'

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
  const numQuestions = useSettings((s) => s.numQuestions)
  const timerDuration = useSettings((s) => s.timerDuration)

  const isOnline = mode === 'online'

  // Server-derived timer (only active during question phase)
  const { timeLeft, isExpired } = useServerTimer(
    currentPhase === 'question' ? questionStartedAt : null,
    timerDuration,
  )

  // Track local answer optimistically
  const [localAnswer, setLocalAnswer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  // Reset local answer when round changes
  const currentRound = gameState?.current_round ?? 0
  useEffect(() => {
    setLocalAnswer(null)
    setSubmitting(false)
    setAdvancing(false)
  }, [currentRound])

  // Also reset advancing when phase changes
  useEffect(() => {
    setAdvancing(false)
  }, [currentPhase])

  // Current question from server state
  const currentQuestion = gameState?.current_question ?? null
  const roundResults = gameState?.round_results ?? null
  const totalQuestions = gameState?.deck?.length ?? numQuestions
  const questionNumber = currentRound + 1

  // Current category (from session state)
  const currentCategoryId = gameState?.triviaSession?.currentCategory ?? null
  const currentCategory = useMemo(
    () => getCategoryById(currentCategoryId),
    [currentCategoryId],
  )

  // My player object
  const myPlayer = useMemo(
    () => players.find((p) => p.id === localPlayerId),
    [players, localPlayerId],
  )

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

  // Auto-reveal on timeout (idempotent, any client can fire)
  const timeoutFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'question') {
      timeoutFiredRef.current = false
      return
    }
    if (!isExpired || timeoutFiredRef.current) return
    timeoutFiredRef.current = true
    rpcTimeoutReveal(roomCode, currentRound).catch((err) =>
      console.error('[useTrivia] timeoutReveal error:', err),
    )
  }, [isExpired, currentPhase, roomCode, currentRound])

  // Auto-transition: countdown → question (host fires after 4s)
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'countdown') {
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
      rpcBeginRound(roomCode).catch((err) =>
        console.error('[useTrivia] beginRound error:', err),
      )
    }, delay)

    return () => clearTimeout(timer)
  }, [currentPhase, isHost, roomCode, questionStartedAt])

  // Host advance: next question or new game
  const hostAdvance = useCallback(async () => {
    if (!isOnline || !isHost || advancing) return
    setAdvancing(true)
    const { error } = await rpcHostAdvance(roomCode, localPlayerId)
    if (error) {
      console.error('[useTrivia] hostAdvance error:', error)
      useSession.getState().showError('generic')
    }
    setAdvancing(false)
  }, [isOnline, isHost, advancing, roomCode, localPlayerId])

  // "Rigioca" / "Prossimo round" — comportamento smart per session mode:
  // - In session mid-round (round N+1 < totalRounds): rpcHostAdvance porta tutti
  //   in trivia_lobby (server-side logic) per il prossimo spin
  // - In session end o single-round: reset session e torna in trivia_lobby
  //   per iniziare una nuova sessione
  const hostReplay = useCallback(async () => {
    if (!isOnline || !isHost || advancing) return
    setAdvancing(true)
    const { setAwaitingGameChange, showError } = useSession.getState()

    const sessionInfo = gameState?.triviaSession
    const hasMoreRounds = sessionInfo
      && (sessionInfo.roundIdx + 1) < (sessionInfo.totalRounds ?? 1)

    if (hasMoreRounds) {
      // Mid-session: DB host_advance porta tutti in trivia_lobby.
      const { error } = await rpcHostAdvance(roomCode, localPlayerId)
      if (error) {
        console.error('[useTrivia] hostReplay (next round) error:', error)
        showError('generic')
      }
      setAdvancing(false)
      return
    }

    // Fine sessione: reset session + torna in trivia_lobby per nuovo giro.
    setAwaitingGameChange(true)
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({
      ...p,
      score: 0,
      current_streak: 0,
      best_streak: 0,
      correct_count: 0,
      total_speed_ms: 0,
    }))
    const newState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: 'trivia',
      selectedGame: 'trivia',
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      // triviaSession verrà reinizializzato dalla lobby
    }
    await pushRoom(roomCode, 'trivia_lobby', newState)
    setAwaitingGameChange(false)
    setAdvancing(false)
  }, [isOnline, isHost, advancing, roomCode, localPlayerId, gameState])

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
    myRoundResult,
    localAnswer,
    submitting,
    advancing,
    currentCategory,

    // Timer
    timeLeft,
    isExpired,
    timerDuration,

    // Countdown
    questionStartedAt,

    // Actions
    submitAnswer,
    hostAdvance,
    hostReplay,
  }
}
