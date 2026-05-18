// Lobby di gioco Trivia — solo settings + giocatori + Start.
// La ruota delle categorie vive nello schermo di gioco (WheelPhase), non qui.

import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { pushRoom } from '../lib/room'
import { preloadPool } from '../lib/aiQuestions'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const TRIVIA_ROUND_OPTIONS = [1, 2, 3, 5]
const TRIVIA_QUESTION_OPTIONS = [3, 5, 10, 15]

const TriviaLobbyScreen = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()

  const isHost         = useSession((s) => s.isHost)
  const mode           = useSession((s) => s.mode)
  const players        = useSession((s) => s.players)
  const gameState      = useSession((s) => s.gameState)
  const showError      = useSession((s) => s.showError)
  const setAwaitingGC  = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo

  const triviaSessionRoundsLocal = useSettings((s) => s.triviaSessionRounds)
  const triviaQuestionsLocal     = useSettings((s) => s.triviaQuestionsPerRound)
  const setTotalRounds           = useSettings((s) => s.setTriviaSessionRounds)
  const setQuestionsPerRound     = useSettings((s) => s.setTriviaQuestionsPerRound)

  const session = gameState?.triviaSession ?? null
  const roundIdx          = session?.roundIdx ?? 0
  const totalRounds       = session?.totalRounds ?? triviaSessionRoundsLocal
  const questionsPerRound = session?.questionsPerRound ?? triviaQuestionsLocal
  const launching = session?.launching ?? false

  const launchingRef = useRef(false)
  useEffect(() => { launchingRef.current = launching }, [launching])
  useEffect(() => { launchingRef.current = false }, [])

  useEffect(() => { preloadPool() }, [])

  // Init session
  useEffect(() => {
    if (!canControl) return
    if (gameState?.triviaSession) return
    const s = useSession.getState()
    const newGameState = {
      ...s.gameState,
      triviaSession: {
        roundIdx: 0,
        totalRounds: triviaSessionRoundsLocal,
        questionsPerRound: triviaQuestionsLocal,
        categoriesPlayed: [],
        cumulativeScores: {},
        spinTarget: null,
      },
    }
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

  const updateSessionSetting = useCallback((patch) => {
    if (!canControl) return
    const s = useSession.getState()
    const newSession = { ...(s.gameState?.triviaSession ?? {}), ...patch }
    const newGameState = { ...s.gameState, triviaSession: newSession }
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

  const handleQuestionsChange = (n) => {
    setQuestionsPerRound(n)
    updateSessionSetting({ questionsPerRound: n })
  }

  const handleRoundsChange = (n) => {
    setTotalRounds(n)
    updateSessionSetting({ totalRounds: n })
  }

  const handleExit = async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: (s.players || []).map((p) => ({ ...p, score: 0 })),
      currentIdx: 0,
      round: 0,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      selectedGameCategory: s.gameState?.selectedGameCategory ?? null,
      gameCategoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    }
    await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGC(false)
  }

  const handleStart = useCallback(async () => {
    if (!canControl || launchingRef.current) return
    launchingRef.current = true

    const s = useSession.getState()
    const currentSession = s.gameState?.triviaSession ?? {
      roundIdx: 0,
      totalRounds: triviaSessionRoundsLocal,
      questionsPerRound: triviaQuestionsLocal,
      categoriesPlayed: [],
      cumulativeScores: {},
      spinTarget: null,
    }
    const nextSession = {
      ...currentSession,
      spinTarget: null,
      launching: false,
    }
    const newGameState = {
      ...s.gameState,
      activeGame: 'trivia',
      selectedGame: 'trivia',
      triviaSession: nextSession,
    }

    if (s.mode === 'online' && s.roomCode) {
      const fullState = {
        players: s.players,
        currentIdx: 0,
        round: 0,
        activeGame: 'trivia',
        selectedGame: 'trivia',
        selectedCategory: s.gameState?.selectedCategory ?? null,
        categoryVotes: s.gameState?.categoryVotes ?? {},
        triviaSession: nextSession,
      }
      const { error } = await pushRoom(s.roomCode, 'trivia_wheel', fullState)
      if (error) {
        console.error('[trivia-lobby] handleStart:', error)
        showError('generic')
        launchingRef.current = false
      }
    } else {
      useSession.setState({
        gameState: newGameState,
        currentPhase: 'trivia_wheel',
        activeGame: 'trivia',
      })
      navigate('/game/trivia', { replace: true })
    }
  }, [canControl, triviaSessionRoundsLocal, triviaQuestionsLocal, showError, navigate])

  if (launching) {
    return <BlobLoader text="Caricamento..." />
  }

  const isContinuing = roundIdx > 0

  return (
    <GameLobbyLayout
      gameName="Trivia"
      gameDescription={
        isContinuing
          ? `Round ${roundIdx + 1}/${totalRounds} in arrivo`
          : 'Domande a tempo, una categoria a round'
      }
      players={players}
      canControl={canControl}
      onBack={handleExit}
      onStart={handleStart}
      launching={launching}
    >
      <LobbySegmented
        label="Round"
        options={TRIVIA_ROUND_OPTIONS}
        value={totalRounds}
        onChange={handleRoundsChange}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching || isContinuing}
      />
      <LobbySegmented
        label="Domande per round"
        options={TRIVIA_QUESTION_OPTIONS}
        value={questionsPerRound}
        onChange={handleQuestionsChange}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching || isContinuing}
      />
    </GameLobbyLayout>
  )
}

export default TriviaLobbyScreen
