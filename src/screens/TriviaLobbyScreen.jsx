// Lobby di gioco Trivia — solo settings + giocatori + Start.
// La ruota delle categorie vive nello schermo di gioco (WheelPhase), non qui.

import { useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { pushRoom } from '../lib/room'
import { preloadPool } from '../lib/aiQuestions'

const TriviaLobbyScreen = () => {
  const navigate = useNavigate()

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
  const startLabel = isContinuing
    ? `Round ${roundIdx + 1}`
    : totalRounds > 1
      ? `Gioca · ${totalRounds} round`
      : 'Gioca'

  return (
    <GameLobbyLayout
      gameEmoji="🧠"
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
      startLabel={startLabel}
    >
      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={settingsCard}
      >
        <div style={settingRow}>
          <span style={settingLabelStyle}>Round</span>
          <Stepper
            value={totalRounds}
            onDecrement={() => canControl && handleRoundsChange(totalRounds - 1)}
            onIncrement={() => canControl && handleRoundsChange(totalRounds + 1)}
            disabled={!canControl || launching || isContinuing}
            min={1} max={5}
          />
        </div>
        <div style={{ ...settingRow, marginTop: 'clamp(6px, 1dvh, 10px)' }}>
          <span style={settingLabelStyle}>Domande</span>
          <Stepper
            value={questionsPerRound}
            onDecrement={() => canControl && handleQuestionsChange(questionsPerRound - 1)}
            onIncrement={() => canControl && handleQuestionsChange(questionsPerRound + 1)}
            disabled={!canControl || launching || isContinuing}
            min={1} max={15}
          />
        </div>
      </motion.div>
    </GameLobbyLayout>
  )
}

const Stepper = ({ value, onDecrement, onIncrement, disabled, min, max }) => {
  const decDisabled = disabled || value <= min
  const incDisabled = disabled || value >= max
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.button
        type="button"
        onClick={onDecrement}
        disabled={decDisabled}
        whileHover={decDisabled ? undefined : { scale: 1.1 }}
        whileTap={decDisabled ? undefined : { scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{ ...stepBtn, opacity: decDisabled ? 0.4 : 1 }}
      >
        {'−'}
      </motion.button>
      <span style={stepValue}>{value}</span>
      <motion.button
        type="button"
        onClick={onIncrement}
        disabled={incDisabled}
        whileHover={incDisabled ? undefined : { scale: 1.1 }}
        whileTap={incDisabled ? undefined : { scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{ ...stepBtn, opacity: incDisabled ? 0.4 : 1 }}
      >
        +
      </motion.button>
    </div>
  )
}

const settingsCard = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
  padding: 'clamp(10px, 1.5dvh, 14px) clamp(14px, 3vw, 18px)',
}
const settingRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}
const settingLabelStyle = {
  fontSize: 'clamp(13px, 1.5dvh, 15px)',
  fontWeight: 700,
  color: 'var(--text)',
}
const stepBtn = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1.5px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 17,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const stepValue = {
  minWidth: 26,
  textAlign: 'center',
  fontSize: 'clamp(15px, 1.8dvh, 19px)',
  fontWeight: 900,
  color: 'var(--accent)',
}

export default TriviaLobbyScreen
