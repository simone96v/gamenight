// Lobby Movie Quiz — solo stepper "Domande" + bottone Start. No categorie, no ruota.

import { useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import {
  loadEmojiQuizDeck,
  preloadEmojiQuizPool,
} from '../lib/emojiQuizDeck'

const DEFAULT_QUESTIONS = 7
const MIN_QUESTIONS = 5
const MAX_QUESTIONS = 15
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

  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const roomCode = useSession((s) => s.roomCode)
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
      gameEmoji="🎬"
      gameName="Movie Quiz"
      gameDescription="Decifra gli emoji: film o serie TV."
      players={players}
      canControl={canControl}
      onBack={handleExit}
    >
      {/* Settings: solo numero domande */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={settingsCard}
      >
        <div style={settingRow}>
          <span style={settingLabelStyle}>Domande</span>
          <Stepper
            value={questionsPerRound}
            onDecrement={() => canControl && handleQuestionsChange(questionsPerRound - 1)}
            onIncrement={() => canControl && handleQuestionsChange(questionsPerRound + 1)}
            disabled={!canControl || launching}
            min={MIN_QUESTIONS} max={MAX_QUESTIONS}
          />
        </div>
        <div style={{ ...settingRow, marginTop: 'clamp(8px, 1.2dvh, 12px)', alignItems: 'flex-start' }}>
          <span style={settingLabelStyle}>Difficoltà</span>
          <div style={chipRow}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.id
              const dis = !canControl || launching
              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  onClick={() => !dis && handleDifficultyChange(opt.id)}
                  disabled={dis}
                  whileHover={dis || active ? undefined : { scale: 1.04 }}
                  whileTap={dis ? undefined : { scale: 0.96 }}
                  style={{
                    ...chipBtn,
                    background: active ? 'var(--accent)' : 'var(--surface)',
                    color: active ? 'var(--bg)' : 'var(--text)',
                    border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border-strong)',
                    opacity: dis && !active ? 0.5 : 1,
                    cursor: dis ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Start button */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={handleStart}
        disabled={!canControl || launching}
        whileHover={!canControl || launching ? undefined : { scale: 1.02 }}
        whileTap={!canControl || launching ? undefined : { scale: 0.98 }}
        style={{
          ...startBtn,
          opacity: !canControl || launching ? 0.5 : 1,
          cursor: !canControl || launching ? 'not-allowed' : 'pointer',
        }}
      >
        {canControl ? 'Inizia' : 'In attesa dell\'host…'}
      </motion.button>
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
        −
      </motion.button>
      <span style={stepValueStyle}>{value}</span>
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
const stepValueStyle = {
  minWidth: 26,
  textAlign: 'center',
  fontSize: 'clamp(15px, 1.8dvh, 19px)',
  fontWeight: 900,
  color: 'var(--accent)',
}
const chipRow = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}
const chipBtn = {
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  fontWeight: 800,
  letterSpacing: '0.01em',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface)',
}
const startBtn = {
  marginTop: 'clamp(10px, 1.5dvh, 14px)',
  width: '100%',
  padding: 'clamp(12px, 1.8dvh, 16px)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--bg)',
  fontSize: 'clamp(15px, 2dvh, 18px)',
  fontWeight: 900,
  letterSpacing: '0.02em',
  boxShadow: 'var(--shadow-sm)',
}

export default EmojiQuizLobbyScreen
