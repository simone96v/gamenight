// Lobby Movie Quiz — selettore "Domande" + "Difficoltà" + bottone Start.

import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import {
  loadEmojiQuizDeck,
  preloadEmojiQuizPool,
} from '../lib/emojiQuizDeck'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const DEFAULT_QUESTIONS = 7
const MIN_QUESTIONS = 5
const MAX_QUESTIONS = 15
const QUESTION_OPTIONS = [5, 7, 10, 15]
const DEFAULT_DIFFICULTY = 'mix'
const DIFFICULTY_OPTIONS = [
  { id: 'mix',    label: 'Mix' },
  { id: 'easy',   label: 'Facile' },
  { id: 'medium', label: 'Medio' },
  { id: 'hard',   label: 'Difficile' },
]

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const EmojiQuizLobbyScreen = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()

  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo

  const session = gameState?.eqSession ?? null
  const questionsPerRound = session?.questionsPerRound ?? DEFAULT_QUESTIONS
  const difficulty = session?.difficulty ?? DEFAULT_DIFFICULTY
  const launching = session?.launching ?? false

  const launchingRef = useRef(false)
  useEffect(() => { launchingRef.current = launching }, [launching])
  useEffect(() => { launchingRef.current = false }, [])

  useEffect(() => { preloadEmojiQuizPool() }, [])

  // Init / reset session
  useEffect(() => {
    if (!canControl) return
    const cur = gameState?.eqSession
    const needsReset = !cur || cur.launching === true
    if (!needsReset) return

    const s = useSession.getState()
    const newSession = {
      roundIdx: 0,
      totalRounds: 1,
      questionsPerRound: cur?.questionsPerRound ?? DEFAULT_QUESTIONS,
      difficulty: cur?.difficulty ?? DEFAULT_DIFFICULTY,
      currentCategory: null,
      launching: false,
    }
    const newGameState = { ...s.gameState, eqSession: newSession }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canControl])

  const updateSession = useCallback((patch) => {
    if (!canControl) return
    const s = useSession.getState()
    const newSession = { ...(s.gameState?.eqSession ?? {}), ...patch }
    const newGameState = { ...s.gameState, eqSession: newSession }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
  }, [canControl])

  const handleQuestionsChange = (n) =>
    updateSession({ questionsPerRound: clamp(n, MIN_QUESTIONS, MAX_QUESTIONS) })

  const handleDifficultyChange = (id) => updateSession({ difficulty: id })

  const handleExit = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 })),
      currentIdx: 0,
      round: 0,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const handleStart = useCallback(async () => {
    if (!canControl || launchingRef.current) return
    launchingRef.current = true

    const s = useSession.getState()
    const freshSession = s.gameState?.eqSession ?? {}
    const launchSession = {
      ...freshSession,
      currentCategory: null,
      launching: true,
    }
    const launchGameState = { ...s.gameState, eqSession: launchSession }
    useSession.setState({ gameState: launchGameState })

    try {
      const deck = await loadEmojiQuizDeck(
        launchSession.questionsPerRound ?? DEFAULT_QUESTIONS,
        launchSession.difficulty ?? DEFAULT_DIFFICULTY,
      )
      const now = new Date().toISOString()

      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'emojiquiz',
        selectedGame: 'emojiquiz',
        eqSession: { ...launchSession, launching: false },
        eqDeck: deck,
        eqRoundIdx: 0,
        eqRoundAnswers: {},
        eqHintUsed: {},
        eqRoundResult: null,
        eqRoundLog: [],
        eqScores: {},
        eqStreaks: {},
        eqCorrectCount: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'emojiquiz_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          updateSession({ launching: false })
          launchingRef.current = false
        }
      } else {
        useSession.setState({
          players: fullState.players,
          gameState: fullState,
          currentPhase: 'emojiquiz_countdown',
          questionStartedAt: now,
          activeGame: 'emojiquiz',
        })
        navigate('/game/emojiquiz', { replace: true })
      }
    } catch (e) {
      console.error('[movie-quiz-lobby] start:', e)
      showError('generic')
      updateSession({ launching: false })
      launchingRef.current = false
    }
  }, [canControl, showError, updateSession, navigate])

  if (launching) {
    return <BlobLoader text="Preparando le domande..." />
  }

  return (
    <GameLobbyLayout
      gameName="Movie Quiz"
      gameDescription="Decifra gli emoji: film o serie TV."
      players={players}
      canControl={canControl}
      onBack={handleExit}
      onStart={handleStart}
      launching={launching}
    >
      <LobbySegmented
        label="Domande"
        options={QUESTION_OPTIONS}
        value={questionsPerRound}
        onChange={handleQuestionsChange}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
      <LobbySegmented
        label="Difficoltà"
        options={DIFFICULTY_OPTIONS}
        value={difficulty}
        onChange={handleDifficultyChange}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
    </GameLobbyLayout>
  )
}

export default EmojiQuizLobbyScreen
