import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { haptic } from '../../utils/haptic'
import { shuffle } from '../../utils/deck'
import promptsData from './data/prompts.json'
import answersData from './data/answers.json'

const SELECTION_TIMER = 30
const JUDGING_TIMER = 30
const SETUP_DELAY = 3500
const DEFAULT_ROUNDS = 8

export const initSentenzaState = (players, totalRounds = DEFAULT_ROUNDS) => {
  const prompts = shuffle(promptsData.prompts).slice(0, totalRounds)
  return {
    deck: prompts,
    answerPool: shuffle(answersData.answers),
    answerPoolIdx: 0,
    currentRound: 0,
    totalRounds,
    judgeIdx: 0,
    currentPrompt: prompts[0],
    hands: {},
    submissions: {},
    proofs: [],
    verdict: null,
    roundsWon: Object.fromEntries(players.map((p) => [p.id, 0])),
  }
}

export const useSentenza = () => {
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

  const isOnline = mode === 'online'
  const currentRound = gameState?.currentRound ?? 0
  const totalRounds = gameState?.totalRounds ?? DEFAULT_ROUNDS
  const judgeIdx = gameState?.judgeIdx ?? 0
  const judge = players[judgeIdx % players.length] ?? null
  const isJudge = judge?.id === localPlayerId
  const currentPrompt = gameState?.currentPrompt ?? null
  const hands = gameState?.hands ?? {}
  const myHand = hands[localPlayerId] ?? []
  const submissions = gameState?.submissions ?? {}
  const proofs = gameState?.proofs ?? []
  const verdict = gameState?.verdict ?? null
  const roundsWon = gameState?.roundsWon ?? {}
  const challengers = players.filter((p) => p.id !== judge?.id)

  const isSelectionPhase = currentPhase === 'sentenza_selection'
  const isJudgingPhase = currentPhase === 'sentenza_judging'

  const { timeLeft, isExpired } = useServerTimer(
    (isSelectionPhase || isJudgingPhase) ? questionStartedAt : null,
    isSelectionPhase ? SELECTION_TIMER : JUDGING_TIMER,
  )

  const [advancing, setAdvancing] = useState(false)

  useEffect(() => { setAdvancing(false) }, [currentPhase])

  // ---- Host: countdown → judging_setup ----
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'sentenza_countdown') {
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
      dealCards()
      setPhase('sentenza_judging_setup')
    }, delay)
    return () => clearTimeout(timer)
  }, [currentPhase, isHost, questionStartedAt])

  // ---- Host: judging_setup → selection (after 3.5s) ----
  const setupFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'sentenza_judging_setup') {
      setupFiredRef.current = false
      return
    }
    if (!isHost || setupFiredRef.current) return
    setupFiredRef.current = true
    const timer = setTimeout(() => {
      setPhaseWithTimer('sentenza_selection')
    }, SETUP_DELAY)
    return () => clearTimeout(timer)
  }, [currentPhase, isHost, setPhaseWithTimer])

  // ---- Host: auto-transition selection → judging when timer expires ----
  const selectionTimeoutRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'sentenza_selection') {
      selectionTimeoutRef.current = false
      return
    }
    if (!isHost || !isExpired || selectionTimeoutRef.current) return
    selectionTimeoutRef.current = true
    const t = setTimeout(() => buildProofsAndAdvance(), 800)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, isExpired])

  // ---- Host: early transition when all challengers submitted ----
  const allSubmittedRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'sentenza_selection') {
      allSubmittedRef.current = false
      return
    }
    if (!isHost || allSubmittedRef.current) return
    const subs = gameState?.submissions ?? {}
    const allSubmitted = challengers.length > 0 && challengers.every((p) => subs[p.id])
    if (!allSubmitted) return
    allSubmittedRef.current = true
    const t = setTimeout(() => buildProofsAndAdvance(), 600)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, gameState?.submissions, challengers])

  // ---- Host: auto-transition judging → reveal when timer expires ----
  const judgingTimeoutRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'sentenza_judging') {
      judgingTimeoutRef.current = false
      return
    }
    if (!isHost || !isExpired || judgingTimeoutRef.current) return
    judgingTimeoutRef.current = true
    const t = setTimeout(() => autoVerdict(), 800)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, isExpired])

  // ---- Deal cards to challengers ----
  const dealCards = useCallback(() => {
    const s = useSession.getState()
    const gs = s.gameState ?? {}
    const pool = gs.answerPool ?? []
    let idx = gs.answerPoolIdx ?? 0
    const jIdx = gs.judgeIdx ?? 0
    const j = s.players[jIdx % s.players.length]
    const chs = s.players.filter((p) => p.id !== j?.id)
    const cardsNeeded = chs.length * 4

    if (idx + cardsNeeded > pool.length) {
      idx = 0
      setGameState({ answerPool: shuffle(pool), answerPoolIdx: 0 })
    }

    const newHands = {}
    chs.forEach((p) => {
      newHands[p.id] = pool.slice(idx, idx + 4)
      idx += 4
    })
    setGameState({ hands: newHands, answerPoolIdx: idx, submissions: {} })
  }, [setGameState])

  // ---- Build anonymous proofs for judge ----
  const buildProofsAndAdvance = useCallback(() => {
    const gs = useSession.getState().gameState ?? {}
    const subs = gs.submissions ?? {}
    const h = gs.hands ?? {}
    const proofList = []

    Object.entries(subs).forEach(([playerId, answerId]) => {
      const hand = h[playerId] ?? []
      const card = hand.find((c) => c.id === answerId)
      if (card) {
        proofList.push({ id: playerId, text: card.text })
      }
    })

    setGameState({ proofs: shuffle(proofList) })
    setPhaseWithTimer('sentenza_judging')
  }, [setGameState, setPhaseWithTimer])

  // ---- Auto-verdict: random pick if judge didn't choose ----
  const autoVerdict = useCallback(() => {
    const gs = useSession.getState().gameState ?? {}
    if (gs.verdict) return
    const p = gs.proofs ?? []
    if (p.length === 0) {
      setPhase('sentenza_reveal')
      return
    }
    const pick = p[Math.floor(Math.random() * p.length)]
    setGameState({ verdict: { answerId: pick.id, playerId: pick.id } })
    setPhase('sentenza_reveal')
  }, [setGameState, setPhase])

  // ---- Player: submit proof ----
  const submitProof = useCallback((answerId) => {
    if (isJudge || !answerId) return
    const gs = useSession.getState().gameState ?? {}
    const subs = { ...(gs.submissions ?? {}), [localPlayerId]: answerId }
    setGameState({ submissions: subs })
  }, [isJudge, localPlayerId, setGameState])

  // ---- Judge: emit verdict ----
  const emitVerdict = useCallback((proofPlayerId) => {
    if (!isJudge || !proofPlayerId) return
    haptic.heavy()
    setGameState({ verdict: { answerId: proofPlayerId, playerId: proofPlayerId } })
    setPhase('sentenza_reveal')
  }, [isJudge, setGameState, setPhase])

  // ---- Host: advance from reveal to next round or final ----
  const hostAdvance = useCallback(() => {
    if (!isHost || advancing) return
    setAdvancing(true)

    const s = useSession.getState()
    const gs = s.gameState ?? {}
    const v = gs.verdict
    const rw = { ...(gs.roundsWon ?? {}) }

    if (v?.playerId) {
      useSession.getState().addScore(v.playerId, 1)
      rw[v.playerId] = (rw[v.playerId] ?? 0) + 1
    }

    const nextRound = (gs.currentRound ?? 0) + 1
    const dk = gs.deck ?? []
    const nextJudge = ((gs.judgeIdx ?? 0) + 1) % s.players.length

    if (nextRound >= dk.length || nextRound >= (gs.totalRounds ?? DEFAULT_ROUNDS)) {
      setGameState({
        currentRound: nextRound,
        roundsWon: rw,
        verdict: null,
        hands: {},
        submissions: {},
        proofs: [],
      })
      setPhase('sentenza_final')
    } else {
      setGameState({
        currentRound: nextRound,
        currentPrompt: dk[nextRound],
        judgeIdx: nextJudge,
        roundsWon: rw,
        verdict: null,
        hands: {},
        submissions: {},
        proofs: [],
      })
      setPhaseWithTimer('sentenza_countdown')
    }
  }, [isHost, advancing, setGameState, setPhase, setPhaseWithTimer])

  // ---- Derived data for UI ----
  const submittedIds = Object.keys(submissions)
  const mySubmission = submissions[localPlayerId] ?? null
  const myAnswer = myHand.find((c) => c.id === mySubmission)?.text ?? null

  const winnerPlayerId = verdict?.playerId ?? null
  const winnerPlayer = players.find((p) => p.id === winnerPlayerId) ?? null
  const winnerProof = proofs.find((p) => p.id === winnerPlayerId)
  const otherProofs = proofs
    .filter((p) => p.id !== winnerPlayerId)
    .map((p) => ({
      ...p,
      playerName: players.find((pl) => pl.id === p.id)?.name ?? '???',
      answer: p.text,
    }))

  const playersWithRounds = players.map((p) => ({
    ...p,
    roundsWon: roundsWon[p.id] ?? 0,
  }))

  const hasMoreRounds = currentRound + 1 < totalRounds

  return {
    currentPhase,
    questionStartedAt,
    currentRound,
    totalRounds,
    hasMoreRounds,
    judge,
    isJudge,
    currentPrompt,
    myHand,
    submissions,
    submittedIds,
    mySubmission,
    myAnswer,
    proofs,
    verdict,
    winnerPlayer,
    winnerProof,
    otherProofs,
    challengers,
    players: playersWithRounds,
    isHost,
    localPlayerId,
    isOnline,
    advancing,
    timeLeft,
    isExpired,
    submitProof,
    emitVerdict,
    hostAdvance,
  }
}
