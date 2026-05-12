import { useMemo, useEffect, useState, useCallback } from 'react'
import { useSession } from '../../stores/useSession'
import { useSettings } from '../../stores/useSettings'
import { useGameState } from '../../hooks/useGameState'
import { pushVote } from '../../lib/room'
import { shuffle } from '../../utils/deck'
import questionsAll from '../../data/questions/trivia.json'

const POINTS_CORRECT = 10
const POINTS_FIRST_BONUS = 3

export const useTrivia = ({ onEnd, localPlayerId }) => {
  const players = useSession((s) => s.players)
  const addScore = useSession((s) => s.addScore)
  const roomCode = useSession((s) => s.roomCode)
  const mode = useSession((s) => s.mode)
  const category = useSettings((s) => s.category)

  const { gameState, updateGameState, canWrite } = useGameState({
    phase: 'waiting',
    questionIndex: 0,
    deckOrder: [],
    answers: {},
    revealed: false,
    roundScores: {},
  })

  const [localAnswer, setLocalAnswer] = useState(null)

  const questions = useMemo(() => {
    const filtered = questionsAll.filter((q) => q.category === category)
    return filtered.length >= 5 ? filtered : questionsAll
  }, [category])

  useEffect(() => {
    if (!canWrite) return
    if (gameState.deckOrder && gameState.deckOrder.length > 0) return
    const order = shuffle(questions.map((_, i) => i))
    updateGameState({
      phase: 'waiting',
      questionIndex: 0,
      deckOrder: order,
      answers: {},
      revealed: false,
      roundScores: {},
    })
  }, [canWrite])

  // Reset local answer when question changes or phase resets
  useEffect(() => {
    setLocalAnswer(null)
  }, [gameState.questionIndex, gameState.phase === 'waiting'])

  const currentQuestion = useMemo(() => {
    if (!gameState.deckOrder || gameState.deckOrder.length === 0) return null
    const idx = gameState.deckOrder[gameState.questionIndex ?? 0]
    return questions[idx] ?? null
  }, [gameState.deckOrder, gameState.questionIndex, questions])

  const myAnswer = gameState.answers?.[localPlayerId] ?? null
  const answeredCount = Object.keys(gameState.answers ?? {}).length
  const totalCount = players.length
  const allAnswered = answeredCount >= totalCount
  const hasAnswered = localAnswer !== null || myAnswer !== null

  const submitAnswer = useCallback(
    async (answerIndex) => {
      if (localAnswer !== null || myAnswer !== null) return
      if (gameState.phase !== 'answering') return

      setLocalAnswer(answerIndex)

      if (mode === 'online') {
        const { error } = await pushVote(roomCode, localPlayerId, answerIndex)
        if (error) {
          setLocalAnswer(null)
          useSession.getState().showError('generic')
        }
      } else {
        updateGameState({
          answers: { ...gameState.answers, [localPlayerId]: answerIndex },
        })
      }
    },
    [localAnswer, myAnswer, gameState.phase, gameState.answers, mode, roomCode, localPlayerId, updateGameState],
  )

  const startQuestion = useCallback(() => {
    if (!canWrite) return
    updateGameState({
      phase: 'answering',
      answers: {},
      revealed: false,
      roundScores: {},
    })
  }, [canWrite, updateGameState])

  const revealAnswers = useCallback(() => {
    if (!canWrite) return
    if (!currentQuestion) return

    const scores = {}
    let firstCorrect = null
    const entries = Object.entries(gameState.answers ?? {})

    entries.forEach(([pid, ans]) => {
      if (ans === currentQuestion.correct) {
        scores[pid] = POINTS_CORRECT
        if (firstCorrect === null) firstCorrect = pid
      } else {
        scores[pid] = 0
      }
    })

    if (firstCorrect) scores[firstCorrect] += POINTS_FIRST_BONUS

    // Batch: aggiorna i punteggi nello store senza triggerare push individuali,
    // poi fai un unico updateGameState che triggera il push debounced.
    const store = useSession.getState()
    const updatedPlayers = store.players.map((p) => {
      const pts = scores[p.id]
      return pts > 0 ? { ...p, score: p.score + pts } : p
    })
    useSession.setState({ players: updatedPlayers })

    // Questo singolo push contiene sia i punteggi aggiornati che il reveal
    updateGameState({ revealed: true, roundScores: scores })
  }, [canWrite, currentQuestion, gameState.answers, updateGameState])

  const nextQuestion = useCallback(() => {
    if (!canWrite) return
    const nextIdx = (gameState.questionIndex ?? 0) + 1
    if (nextIdx >= (gameState.deckOrder?.length ?? 0)) {
      onEnd({ scores: players.map((p) => ({ id: p.id, score: p.score })) })
      return
    }
    updateGameState({
      phase: 'waiting',
      questionIndex: nextIdx,
      answers: {},
      revealed: false,
      roundScores: {},
    })
  }, [canWrite, gameState.questionIndex, gameState.deckOrder, onEnd, players, updateGameState])

  const hasMoreQuestions =
    (gameState.questionIndex ?? 0) + 1 < (gameState.deckOrder?.length ?? 0)

  const effectiveAnswer = localAnswer ?? myAnswer

  return {
    currentQuestion,
    gameState,
    myAnswer: effectiveAnswer,
    hasAnswered,
    answeredCount,
    totalCount,
    allAnswered,
    canWrite,
    players,
    submitAnswer,
    startQuestion,
    revealAnswers,
    nextQuestion,
    hasMoreQuestions,
    questionNumber: (gameState.questionIndex ?? 0) + 1,
    totalQuestions: gameState.deckOrder?.length ?? 0,
  }
}
