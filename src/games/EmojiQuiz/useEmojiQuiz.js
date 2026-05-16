// Hook orchestratore di Emoji Quiz (free-text input + hint).
//
// Phase machine:
//   emojiquiz_countdown → emojiquiz_question → emojiquiz_reveal → ... → emojiquiz_final
//
// Differenze local/online:
//   - online: il client valida il guess localmente con isCorrect() (ha il deck
//     completo via gameState.eqDeck). Quando corretto, invia castVote('eqRoundAnswers',
//     { round, timeMs, hintUsed }). L'host osserva e arbitra il winner per min timeMs.
//   - local: stesso modello, ma scrive direttamente in gameState (no Realtime).
//
// gameState shape:
//   eqDeck:          [{ id, emoji, category, hint, title, answers[] (varianti) }]
//   eqRoundIdx:      int
//   eqRoundAnswers:  { [pid]: { round, timeMs, hintUsed } }  // solo guess corretti
//   eqHintUsed:      { [pid]: { round: true } }              // chi ha usato l'hint
//   eqRoundResult:   { round, winnerId, winnerName, points: {pid}, title, emoji, category }
//   eqScores:        { pid: totalScore }
//   eqStreaks:       { pid: currentStreak }
//   eqCorrectCount:  { pid: count }
//   eqRoundLog:      ['win'|'lose'|'tie', ...]

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { isCorrect } from './matching'
import { basePoints, comboMult, round10, ROUND_MS } from './scoring'
import { TOTAL_ROUNDS } from './config'

const ROUND_DURATION_S = Math.round(ROUND_MS / 1000) // 25

export const useEmojiQuiz = () => {
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

  const eqDeck = useMemo(() => gameState?.eqDeck ?? [], [gameState?.eqDeck])
  const roundIdx = gameState?.eqRoundIdx ?? 0
  const eqRoundAnswers = useMemo(() => gameState?.eqRoundAnswers ?? {}, [gameState?.eqRoundAnswers])
  const eqHintUsed = useMemo(() => gameState?.eqHintUsed ?? {}, [gameState?.eqHintUsed])
  const eqRoundResult = gameState?.eqRoundResult ?? null
  const eqScores = useMemo(() => gameState?.eqScores ?? {}, [gameState?.eqScores])
  const eqStreaks = useMemo(() => gameState?.eqStreaks ?? {}, [gameState?.eqStreaks])
  const eqCorrectCount = useMemo(() => gameState?.eqCorrectCount ?? {}, [gameState?.eqCorrectCount])
  const eqRoundLog = useMemo(() => gameState?.eqRoundLog ?? [], [gameState?.eqRoundLog])

  const puzzle = eqDeck[roundIdx]
  const totalRounds = eqDeck.length || TOTAL_ROUNDS

  // ── Server timer (fase question) ──
  const timerActive = currentPhase === 'emojiquiz_question'
  const { timeLeft, isExpired } = useServerTimer(
    timerActive ? questionStartedAt : null,
    ROUND_DURATION_S,
  )

  // ── Stato locale UI: input testuale + feedback wrong-guess ──
  const [guess, setGuess] = useState('')
  const [wrongFlash, setWrongFlash] = useState(false)
  const inputRef = useRef(null)
  const inputWrapRef = useRef(null)

  // Reset input quando cambia il round.
  useEffect(() => {
    setGuess('')
    setWrongFlash(false)
  }, [roundIdx, currentPhase])

  // Submitted = il LOCAL player ha già una risposta corretta registrata per questo round.
  const myAnswer = eqRoundAnswers[localPlayerId]
  const submitted = !!(myAnswer && myAnswer.round === roundIdx)

  // Hint usato per questo round dal local player?
  const myHint = eqHintUsed[localPlayerId]
  const hintUsed = !!(myHint && myHint.round === roundIdx)

  // ── Action: submit del guess ──
  // Validazione locale; se corretto invia all'host. Se sbagliato → shake.
  const submitAnswer = useCallback(() => {
    if (currentPhase !== 'emojiquiz_question') return
    if (submitted || !puzzle) return
    if (!guess.trim()) return
    if (isCorrect(guess, puzzle)) {
      const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
      const timeMs = Math.max(0, Date.now() - startMs)
      const payload = { round: roundIdx, timeMs, hintUsed }
      if (isOnline) {
        castVote('eqRoundAnswers', payload)
      } else {
        const next = { ...(gameState?.eqRoundAnswers ?? {}), [localPlayerId]: payload }
        setGameState({ eqRoundAnswers: next })
      }
    } else {
      // Wrong guess: flash + shake, no penalty (può riprovare).
      setWrongFlash(true)
      setTimeout(() => setWrongFlash(false), 380)
      inputWrapRef.current?.animate?.(
        [
          { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' },
          { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' }, { transform: 'translateX(0)' },
        ],
        { duration: 380, easing: 'ease-in-out' },
      )
      setGuess('')
      inputRef.current?.focus()
    }
  }, [
    currentPhase, submitted, puzzle, guess, questionStartedAt, roundIdx,
    hintUsed, isOnline, castVote, localPlayerId, gameState, setGameState,
  ])

  // ── Action: usa l'hint (cappa i punti massimi a 350) ──
  const useHint = useCallback(() => {
    if (currentPhase !== 'emojiquiz_question') return
    if (submitted || hintUsed) return
    const payload = { round: roundIdx, used: true }
    if (isOnline) {
      castVote('eqHintUsed', payload)
    } else {
      const next = { ...(gameState?.eqHintUsed ?? {}), [localPlayerId]: payload }
      setGameState({ eqHintUsed: next })
    }
  }, [currentPhase, submitted, hintUsed, roundIdx, isOnline, castVote, localPlayerId, gameState, setGameState])

  // ── Countdown → Question (via CountdownOverlay.onComplete) ──
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_countdown') countdownFiredRef.current = false
  }, [currentPhase])
  const handleCountdownComplete = useCallback(() => {
    if (!isHost || countdownFiredRef.current) return
    if (currentPhase !== 'emojiquiz_countdown') return
    countdownFiredRef.current = true
    setPhaseWithTimer('emojiquiz_question')
  }, [isHost, currentPhase, setPhaseWithTimer])

  // ── Host: chiusura del round → reveal ──
  // Trigger quando: tutti hanno risposto correttamente OR timer scaduto.
  const revealFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_question') {
      revealFiredRef.current = false
      return
    }
    if (!isHost || revealFiredRef.current || !puzzle) return

    const validAnswers = Object.entries(eqRoundAnswers).filter(
      ([, a]) => a && a.round === roundIdx,
    )
    const allAnswered = players.length > 0 && validAnswers.length >= players.length
    const timedOut = isExpired

    if (!allAnswered && !timedOut) return
    revealFiredRef.current = true

    // Ordine per timeMs: il primo guess corretto vince.
    const sorted = validAnswers
      .map(([pid, a]) => ({ pid, a }))
      .sort((x, y) => x.a.timeMs - y.a.timeMs)
    const winnerId = sorted[0]?.pid ?? null

    // Punti per ogni player che ha indovinato (cappati se hint usato).
    const newStreaks = { ...eqStreaks }
    const newCorrectCount = { ...eqCorrectCount }
    const newScores = { ...eqScores }
    const points = {}
    players.forEach((p) => {
      const ans = eqRoundAnswers[p.id]
      const got = ans && ans.round === roundIdx
      if (got) {
        const streak = (eqStreaks[p.id] ?? 0) + 1
        const pts = round10(basePoints(ans.timeMs, !!ans.hintUsed) * comboMult(streak))
        newStreaks[p.id] = streak
        newCorrectCount[p.id] = (eqCorrectCount[p.id] ?? 0) + 1
        newScores[p.id] = (eqScores[p.id] ?? 0) + pts
        points[p.id] = pts
      } else {
        newStreaks[p.id] = 0
        points[p.id] = 0
      }
    })

    const winnerName = winnerId ? players.find((p) => p.id === winnerId)?.name : null
    const localGot = !!points[localPlayerId]
    const someoneGot = sorted.length > 0
    const logEntry = localGot ? 'win' : someoneGot ? 'lose' : 'tie'

    setGameState({
      eqRoundResult: {
        round: roundIdx,
        winnerId,
        winnerName,
        points,
        title: puzzle.title,
        emoji: puzzle.emoji,
        category: puzzle.category,
      },
      eqScores: newScores,
      eqStreaks: newStreaks,
      eqCorrectCount: newCorrectCount,
      eqRoundLog: [...eqRoundLog, logEntry],
    })
    setPhase('emojiquiz_reveal')
  }, [
    currentPhase, isHost, puzzle, eqRoundAnswers, eqStreaks, eqCorrectCount, eqScores, eqRoundLog,
    players, roundIdx, isExpired, localPlayerId, setGameState, setPhase,
  ])

  // ── Host: advance manuale dal reveal ──
  const advancingRef = useRef(false)
  useEffect(() => {
    if (currentPhase === 'emojiquiz_question') advancingRef.current = false
  }, [currentPhase])

  const hostAdvance = useCallback(() => {
    if (!isHost || advancingRef.current) return
    if (currentPhase !== 'emojiquiz_reveal') return
    advancingRef.current = true

    const s = useSession.getState()
    const curIdx = s.gameState?.eqRoundIdx ?? 0
    const deck = s.gameState?.eqDeck ?? []
    const nextIdx = curIdx + 1

    if (nextIdx >= deck.length) {
      const totals = s.gameState?.eqScores ?? {}
      const corrects = s.gameState?.eqCorrectCount ?? {}
      const updatedPlayers = (s.players || []).map((p) => ({
        ...p,
        score: totals[p.id] ?? 0,
        correct_count: corrects[p.id] ?? 0,
      }))
      useSession.setState({ players: updatedPlayers })
      setPhase('emojiquiz_final')
    } else {
      setGameState({
        eqRoundIdx: nextIdx,
        eqRoundAnswers: {},
        eqRoundResult: null,
      })
      setPhaseWithTimer('emojiquiz_question')
    }
  }, [isHost, currentPhase, setGameState, setPhase, setPhaseWithTimer])

  // ── Mapping currentPhase → screen name ──
  const screen = (() => {
    switch (currentPhase) {
      case 'emojiquiz_countdown': return 'countdown'
      case 'emojiquiz_question':  return 'question'
      case 'emojiquiz_reveal':    return 'reveal'
      case 'emojiquiz_final':     return 'final'
      default:                    return 'loading'
    }
  })()

  const hasMoreRounds = roundIdx + 1 < totalRounds

  return {
    // mode info
    isOnline,
    isHost,
    localPlayerId,
    players,
    // session
    screen,
    puzzle,
    questionStartedAt,
    roundIdx,
    totalRounds,
    hasMoreRounds,
    timeLeft,
    timerDuration: ROUND_DURATION_S,
    isExpired,
    // local player state
    guess,
    setGuess,
    wrongFlash,
    submitted,
    hintUsed,
    inputRef,
    inputWrapRef,
    // shared state
    eqRoundAnswers,
    eqRoundResult,
    eqScores,
    eqCorrectCount,
    eqRoundLog,
    // actions
    submitAnswer,
    useHint,
    hostAdvance,
    handleCountdownComplete,
  }
}
