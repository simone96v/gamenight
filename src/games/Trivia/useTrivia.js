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

  const setGameState = useSession((s) => s.setGameState)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)

  // Submit answer — online via RPC, local via client-side scoring
  const submitAnswer = useCallback(
    async (chosenIndex) => {
      if (localAnswer !== null || submitting) return
      if (currentPhase !== 'question') return

      setLocalAnswer(chosenIndex)
      setSubmitting(true)

      if (isOnline) {
        const { error } = await rpcSubmitAnswer(roomCode, localPlayerId, currentRound, chosenIndex)
        if (error) {
          console.error('[useTrivia] submitAnswer error:', error)
          setLocalAnswer(null)
          useSession.getState().showError('generic')
        }
      } else {
        // Local scoring
        const q = gameState?.deck?.[currentRound]
        if (q) {
          const isCorrect = chosenIndex === q.correct
          const elapsed = timerDuration - timeLeft
          const speedMs = Math.round(elapsed * 1000)
          const pts = isCorrect ? Math.max(10, Math.round(100 * (timeLeft / timerDuration))) : 0
          const s = useSession.getState()
          const prev = s.gameState?.round_results ?? {}
          const prevPlayer = s.players.find((p) => p.id === localPlayerId) ?? {}
          const streak = isCorrect ? (prevPlayer.current_streak ?? 0) + 1 : 0
          const result = {
            correct: isCorrect,
            points: pts,
            chosen: chosenIndex,
            correct_idx: q.correct,
            speed_ms: speedMs,
            streak,
          }
          setGameState({ round_results: { ...prev, [localPlayerId]: result } })
          if (pts > 0) useSession.getState().addScore(localPlayerId, pts)
          // Update streak on player
          const updPlayers = s.players.map((p) =>
            p.id === localPlayerId
              ? {
                  ...p,
                  current_streak: streak,
                  best_streak: Math.max(p.best_streak ?? 0, streak),
                  correct_count: (p.correct_count ?? 0) + (isCorrect ? 1 : 0),
                  total_speed_ms: (p.total_speed_ms ?? 0) + speedMs,
                }
              : p,
          )
          useSession.setState({ players: updPlayers })
        }
      }
      setSubmitting(false)
    },
    [localAnswer, submitting, currentPhase, isOnline, roomCode, localPlayerId, currentRound, gameState, timerDuration, timeLeft, setGameState],
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
    if (isOnline) {
      rpcTimeoutReveal(roomCode, currentRound).catch((err) =>
        console.error('[useTrivia] timeoutReveal error:', err),
      )
    } else {
      setPhase('reveal')
    }
  }, [isExpired, currentPhase, isOnline, roomCode, currentRound, setPhase])

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
      if (isOnline) {
        rpcBeginRound(roomCode).catch((err) =>
          console.error('[useTrivia] beginRound error:', err),
        )
      } else {
        // Local: set current question and start timer
        const s = useSession.getState()
        const deck = s.gameState?.deck ?? []
        const round = s.gameState?.current_round ?? 0
        setGameState({ current_question: deck[round], round_results: {} })
        setPhaseWithTimer('question')
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [currentPhase, isHost, isOnline, roomCode, questionStartedAt, setGameState, setPhaseWithTimer])

  // Host advance: next question or new game
  const hostAdvance = useCallback(async () => {
    if (!isHost || advancing) return
    setAdvancing(true)

    if (isOnline) {
      const { error } = await rpcHostAdvance(roomCode, localPlayerId)
      if (error) {
        console.error('[useTrivia] hostAdvance error:', error)
        useSession.getState().showError('generic')
      }
      setAdvancing(false)
      return
    }

    // Local: advance to next question or final
    const s = useSession.getState()
    const deck = s.gameState?.deck ?? []
    const round = (s.gameState?.current_round ?? 0) + 1
    if (round >= deck.length) {
      setGameState({ current_round: round })
      setPhase('final')
    } else {
      setGameState({
        current_round: round,
        current_question: deck[round],
        round_results: {},
      })
      setPhaseWithTimer('countdown')
    }
    setAdvancing(false)
  }, [isOnline, isHost, advancing, roomCode, localPlayerId, setGameState, setPhase, setPhaseWithTimer])

  // "Rigioca" / "Prossimo round" — comportamento smart per session mode:
  // - In session mid-round (round N+1 < totalRounds): rpcHostAdvance porta tutti
  //   in trivia_lobby (server-side logic) per il prossimo spin
  // - In session end o single-round: reset session e torna in trivia_lobby
  //   per iniziare una nuova sessione
  const hostReplay = useCallback(async () => {
    if (!isHost || advancing) return
    setAdvancing(true)
    const { showError } = useSession.getState()

    const sessionInfo = gameState?.triviaSession
    const hasMoreRounds = sessionInfo
      && (sessionInfo.roundIdx + 1) < (sessionInfo.totalRounds ?? 1)

    if (hasMoreRounds) {
      const s = useSession.getState()
      const prevSession = s.gameState?.triviaSession ?? {}
      const nextRound = (prevSession.roundIdx ?? 0) + 1
      const nextSession = {
        ...prevSession,
        roundIdx: nextRound,
        spinTarget: null,
        launching: false,
        currentCategory: null,
      }

      if (isOnline) {
        const newState = {
          players: s.players,
          currentIdx: 0,
          round: 0,
          activeGame: 'trivia',
          selectedGame: 'trivia',
          selectedCategory: s.gameState?.selectedCategory ?? null,
          categoryVotes: s.gameState?.categoryVotes ?? {},
          triviaSession: nextSession,
        }
        const { error } = await pushRoom(roomCode, 'trivia_lobby', newState)
        if (error) {
          console.error('[useTrivia] hostReplay (next round) error:', error)
          showError('generic')
        }
      } else {
        useSession.setState({
          currentPhase: 'trivia_lobby',
          gameState: {
            ...s.gameState,
            triviaSession: nextSession,
          },
        })
      }
      setAdvancing(false)
      return
    }

    // Fine sessione: reset completo + torna in trivia_lobby per nuovo giro.
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({
      ...p,
      score: 0,
      current_streak: 0,
      best_streak: 0,
      correct_count: 0,
      total_speed_ms: 0,
    }))

    if (isOnline) {
      const newState = {
        players: resetPlayers,
        currentIdx: 0,
        round: 0,
        activeGame: 'trivia',
        selectedGame: 'trivia',
        selectedCategory: s.gameState?.selectedCategory ?? null,
        categoryVotes: s.gameState?.categoryVotes ?? {},
        triviaSession: null,
      }
      await pushRoom(roomCode, 'trivia_lobby', newState)
    } else {
      useSession.setState({
        players: resetPlayers,
        currentPhase: 'trivia_lobby',
        gameState: {
          selectedCategory: s.gameState?.selectedCategory ?? null,
          categoryVotes: s.gameState?.categoryVotes ?? {},
          triviaSession: null,
        },
      })
    }
    setAdvancing(false)
  }, [isHost, advancing, roomCode, localPlayerId, gameState, isOnline])

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
