// Hook orchestratore di LogoQuiz — modello "host-resolve" (stile EmojiQuiz/Scramble):
// ogni client invia la sua risposta via castVote('lqAnswers', ...), l'host calcola
// punteggio + transizione a reveal quando tutti hanno risposto OPPURE il timer scade.
//
// Sessione (gameState.lqSession): { numLogos, durationS, mix, launching }
// Deck (gameState.lqDeck): array di Round con `tier` (vedi deckBuilder.js)
// State per-round (gameState):
//   lqRoundIdx     int                                — indice del round corrente nel deck
//   lqAnswers      { [pid]: { round, idx, ms } }      — risposte del round corrente
//   lqRoundResult  { round, points, tier, perPlayer:{[pid]:{pts,correct,streak,ms}} }
//   lqScores       { [pid]: int }                     — score cumulativo
//   lqCorrectCount { [pid]: int }                     — corrette cumulative
//   lqStreaks      { [pid]: int }                     — streak corrente (reset su miss)
//   lqBestStreak   { [pid]: int }                     — record streak partita
//   lqTotalSpeedMs { [pid]: int }                     — somma ms su risposte corrette (per MVP "Occhio di Falco")
//
// Phase machine:
//   logoquiz_lobby → logoquiz_countdown → logoquiz_question → logoquiz_reveal
//   → … (per ogni logo) → logoquiz_final

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { ROUND_DURATION_S } from './constants'
import { computeRoundPoints } from './scoring'

export const useLogoQuiz = () => {
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

  const session = gameState?.lqSession ?? null
  const durationS = session?.durationS ?? ROUND_DURATION_S

  const lqDeck = useMemo(() => gameState?.lqDeck ?? [], [gameState?.lqDeck])
  const roundIdx = gameState?.lqRoundIdx ?? 0
  const totalRounds = lqDeck.length || (session?.numLogos ?? 5)
  const round = lqDeck[roundIdx] ?? null

  const lqAnswers = useMemo(() => gameState?.lqAnswers ?? {}, [gameState?.lqAnswers])
  const lqScores = useMemo(() => gameState?.lqScores ?? {}, [gameState?.lqScores])
  const lqCorrectCount = useMemo(() => gameState?.lqCorrectCount ?? {}, [gameState?.lqCorrectCount])
  const lqStreaks = useMemo(() => gameState?.lqStreaks ?? {}, [gameState?.lqStreaks])
  const lqBestStreak = useMemo(() => gameState?.lqBestStreak ?? {}, [gameState?.lqBestStreak])
  const lqTotalSpeedMs = useMemo(() => gameState?.lqTotalSpeedMs ?? {}, [gameState?.lqTotalSpeedMs])
  const roundResult = gameState?.lqRoundResult ?? null

  const timerActive = currentPhase === 'logoquiz_question'
  const { timeLeft, isExpired } = useServerTimer(
    timerActive ? questionStartedAt : null,
    durationS,
  )

  const myAnswer = lqAnswers[localPlayerId]
  const submitted = !!(myAnswer && myAnswer.round === roundIdx)
  const localAnswer = submitted ? myAnswer.idx : null

  // ── Submit ──
  const submitAnswer = useCallback((idx) => {
    if (currentPhase !== 'logoquiz_question') return
    if (submitted || !round) return
    if (idx < 0 || idx > 3) return
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const ms = Math.max(0, Date.now() - startMs)
    const payload = { round: roundIdx, idx, ms }
    if (isOnline) {
      castVote('lqAnswers', payload)
    } else {
      const next = { ...(gameState?.lqAnswers ?? {}), [localPlayerId]: payload }
      setGameState({ lqAnswers: next })
    }
  }, [currentPhase, submitted, round, roundIdx, questionStartedAt, isOnline, castVote, localPlayerId, gameState, setGameState])

  // ── Countdown → Question ──
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'logoquiz_countdown') countdownFiredRef.current = false
  }, [currentPhase])
  const handleCountdownComplete = useCallback(() => {
    if (!isHost || countdownFiredRef.current) return
    if (currentPhase !== 'logoquiz_countdown') return
    countdownFiredRef.current = true
    setPhaseWithTimer('logoquiz_question')
  }, [isHost, currentPhase, setPhaseWithTimer])

  // ── Host: chiusura round → reveal ──
  const revealFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'logoquiz_question') {
      revealFiredRef.current = false
      return
    }
    if (!isHost || revealFiredRef.current || !round) return

    const valid = Object.entries(lqAnswers).filter(([, a]) => a && a.round === roundIdx)
    const allAnswered = players.length > 0 && valid.length >= players.length
    if (!allAnswered && !isExpired) return
    revealFiredRef.current = true

    const timerMs = durationS * 1000
    const points = {}
    const perPlayer = {}
    const newScores = { ...lqScores }
    const newCorrect = { ...lqCorrectCount }
    const newStreaks = { ...lqStreaks }
    const newBestStreak = { ...lqBestStreak }
    const newTotalSpeed = { ...lqTotalSpeedMs }
    players.forEach((p) => {
      const ans = lqAnswers[p.id]
      const answered = !!(ans && ans.round === roundIdx)
      const wasCorrect = answered && ans.idx === round.correct
      if (wasCorrect) {
        const nextStreak = (lqStreaks[p.id] ?? 0) + 1
        newStreaks[p.id] = nextStreak
        newBestStreak[p.id] = Math.max(lqBestStreak[p.id] ?? 0, nextStreak)
        newCorrect[p.id] = (lqCorrectCount[p.id] ?? 0) + 1
        newTotalSpeed[p.id] = (lqTotalSpeedMs[p.id] ?? 0) + ans.ms
        const pts = computeRoundPoints({
          correct: true,
          elapsedMs: ans.ms,
          timerMs,
          streak: nextStreak,
          tier: round.tier ?? 'easy',
        })
        points[p.id] = pts
        newScores[p.id] = (lqScores[p.id] ?? 0) + pts
        perPlayer[p.id] = { pts, correct: true, streak: nextStreak, ms: ans.ms }
      } else {
        // Sbagliata o timeout: streak azzerata, 0 punti
        newStreaks[p.id] = 0
        points[p.id] = 0
        perPlayer[p.id] = {
          pts: 0,
          correct: false,
          streak: 0,
          ms: answered ? ans.ms : null,
        }
      }
    })

    setGameState({
      lqRoundResult: {
        round: roundIdx,
        tier: round.tier ?? 'easy',
        points,
        perPlayer,
      },
      lqScores: newScores,
      lqCorrectCount: newCorrect,
      lqStreaks: newStreaks,
      lqBestStreak: newBestStreak,
      lqTotalSpeedMs: newTotalSpeed,
    })
    setPhase('logoquiz_reveal')
  }, [
    currentPhase, isHost, round, roundIdx, lqAnswers, lqScores, lqCorrectCount,
    lqStreaks, lqBestStreak, lqTotalSpeedMs, durationS,
    players, isExpired, setGameState, setPhase,
  ])

  // ── Host: advance da reveal → prossimo round / final ──
  const advancingRef = useRef(false)
  useEffect(() => {
    if (currentPhase === 'logoquiz_question') advancingRef.current = false
  }, [currentPhase])

  const hostAdvance = useCallback(() => {
    if (!isHost || advancingRef.current) return
    if (currentPhase !== 'logoquiz_reveal') return
    advancingRef.current = true

    const s = useSession.getState()
    const curIdx = s.gameState?.lqRoundIdx ?? 0
    const deck = s.gameState?.lqDeck ?? []
    const nextIdx = curIdx + 1

    if (nextIdx >= deck.length) {
      // Fine partita — propagate scores into players[].score per la classifica
      // + best_streak per MVP awards.
      const totals = s.gameState?.lqScores ?? {}
      const corrects = s.gameState?.lqCorrectCount ?? {}
      const bestStreak = s.gameState?.lqBestStreak ?? {}
      const totSpeed = s.gameState?.lqTotalSpeedMs ?? {}
      const updatedPlayers = (s.players || []).map((p) => ({
        ...p,
        score: totals[p.id] ?? 0,
        correct_count: corrects[p.id] ?? 0,
        best_streak: bestStreak[p.id] ?? 0,
        total_speed_ms: totSpeed[p.id] ?? 0,
      }))
      useSession.setState({ players: updatedPlayers })
      setPhase('logoquiz_final')
    } else {
      setGameState({
        lqRoundIdx: nextIdx,
        lqAnswers: {},
        lqRoundResult: null,
      })
      setPhaseWithTimer('logoquiz_question')
    }
  }, [isHost, currentPhase, setGameState, setPhase, setPhaseWithTimer])

  // ── Screen ──
  const screen = (() => {
    switch (currentPhase) {
      case 'logoquiz_countdown': return 'countdown'
      case 'logoquiz_question':  return 'question'
      case 'logoquiz_reveal':    return 'reveal'
      case 'logoquiz_final':     return 'final'
      default:                   return 'loading'
    }
  })()

  return {
    isOnline,
    isHost,
    localPlayerId,
    players,
    screen,
    round,
    questionStartedAt,
    roundIdx,
    totalRounds,
    hasMoreRounds: roundIdx + 1 < totalRounds,
    durationS,
    timeLeft,
    isExpired,
    submitted,
    localAnswer,
    lqAnswers,
    lqScores,
    lqCorrectCount,
    lqStreaks,
    lqBestStreak,
    lqTotalSpeedMs,
    roundResult,
    submitAnswer,
    handleCountdownComplete,
    hostAdvance,
  }
}
