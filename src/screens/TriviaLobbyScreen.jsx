// Lobby di gioco Trivia (session-mode).
// Mostra:
//   - settings: numero domande per round + numero round (host only edit)
//   - wheel categorie SINCRONIZZATA tra host e tutti i client
//
// Flow:
//   1. Host configura settings (sync via gameState)
//   2. Host preme Spin → sceglie vincitore → pusha spinTarget su DB
//   3. TUTTI i client (host incluso) vedono la wheel animare via Realtime
//   4. Al termine animazione, host genera deck via AI e lancia il game

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import CategoryWheel from '../components/CategoryWheel'
import ErrorBanner from '../components/ErrorBanner'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { pushRoom, rpcStartGame } from '../lib/room'
import { generateDeck, prefetchCategory, clearAiCache } from '../lib/aiQuestions'
import { TRIVIA_CATEGORIES } from '../games/Trivia/constants'

const ALL_CATEGORIES = TRIVIA_CATEGORIES

const TriviaLobbyScreen = () => {
  const navigate = useNavigate()

  const isHost         = useSession((s) => s.isHost)
  const roomCode       = useSession((s) => s.roomCode)
  const localPlayerId  = useSession((s) => s.localPlayerId)
  const players        = useSession((s) => s.players)
  const gameState      = useSession((s) => s.gameState)
  const showError      = useSession((s) => s.showError)
  const setAwaitingGC  = useSession((s) => s.setAwaitingGameChange)

  const triviaSessionRoundsLocal = useSettings((s) => s.triviaSessionRounds)
  const triviaQuestionsLocal     = useSettings((s) => s.triviaQuestionsPerRound)
  const setTotalRounds           = useSettings((s) => s.setTriviaSessionRounds)
  const setQuestionsPerRound     = useSettings((s) => s.setTriviaQuestionsPerRound)
  const timerDuration            = useSettings((s) => s.timerDuration)

  const session = gameState?.triviaSession ?? null
  const roundIdx        = session?.roundIdx ?? 0
  const totalRounds     = session?.totalRounds ?? triviaSessionRoundsLocal
  const questionsPerRound = session?.questionsPerRound ?? triviaQuestionsLocal
  const categoriesPlayed  = session?.categoriesPlayed ?? []

  // spinTarget arriva dal DB — tutti i client lo vedono via Realtime
  const spinTarget = session?.spinTarget ?? null

  const [launching, setLaunching] = useState(false)

  // Categorie ancora "spinnabili" (escluse quelle già giocate).
  const availableCategories = useMemo(
    () => ALL_CATEGORIES.filter((c) => !categoriesPlayed.includes(c.id)),
    [categoriesPlayed],
  )

  // Init session: se gameState non ha triviaSession, host la crea.
  useEffect(() => {
    if (!isHost) return
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
    if (roundIdx === 0) clearAiCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost])

  // Pre-fetch AI in background.
  useEffect(() => {
    if (!isHost) return
    availableCategories.forEach((c) => prefetchCategory(c.id, questionsPerRound + 3))
  }, [isHost, availableCategories, questionsPerRound])

  // Update settings on session.
  const updateSessionSetting = (patch) => {
    if (!isHost) return
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
  }

  const handleQuestionsChange = (n) => {
    setQuestionsPerRound(n)
    updateSessionSetting({ questionsPerRound: n })
  }

  // Host esce.
  const handleExit = async () => {
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const s = useSession.getState()
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

  // Host clicca Spin → sceglie vincitore → pusha spinTarget su DB.
  // Tutti i client (host incluso) vedranno lo spin via Realtime.
  const handleRequestSpin = useCallback(() => {
    if (!isHost || launching) return
    if (availableCategories.length === 0) return

    // Scegli categoria vincente
    const winIdx = Math.floor(Math.random() * availableCategories.length)
    const winner = availableCategories[winIdx]

    // Push spinTarget su DB → Realtime lo propaga a tutti
    const s = useSession.getState()
    const newSession = {
      ...(s.gameState?.triviaSession ?? {}),
      spinTarget: winner.id,
    }
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
  }, [isHost, launching, availableCategories])

  // Animazione completata — solo l'host genera deck e lancia il game.
  const handleSpinEnd = useCallback(async (category) => {
    if (!isHost || launching) return
    setLaunching(true)
    try {
      const deck = await generateDeck(category.id, questionsPerRound)
      const s = useSession.getState()
      const newSession = {
        ...(s.gameState?.triviaSession ?? {}),
        categoriesPlayed: [...categoriesPlayed, category.id],
        currentCategory: category.id,
        spinTarget: null, // Reset per il prossimo round
      }
      const newGameState = { ...s.gameState, triviaSession: newSession }
      useSession.setState({ gameState: newGameState })
      await pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })

      const resetScores = roundIdx === 0
      const { error } = await rpcStartGame(roomCode, deck, timerDuration, resetScores)
      if (error) {
        console.error('[trivia-lobby] startGame:', error)
        showError('generic')
        setLaunching(false)
      }
    } catch (err) {
      console.error('[trivia-lobby] handleSpinEnd:', err)
      showError('generic')
      setLaunching(false)
    }
  }, [isHost, launching, questionsPerRound, categoriesPlayed, roundIdx, roomCode, timerDuration, showError])

  const ENTRY_TITLES = ['🎬 Round 1', '🎯 Round 2', '🏆 Round Finale']
  const roundTitle = ENTRY_TITLES[roundIdx] ?? `Round ${roundIdx + 1}`

  return (
    <div className="screen screen-narrow">
      <AppHeader
        leading={isHost && (
          <IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>
        )}
        actions={
          <div style={S.roundBadge}>
            {roundIdx + 1}/{totalRounds}
          </div>
        }
      />
      <ErrorBanner />

      <div className="screen-body" style={{
        justifyContent: 'flex-start',
        gap: 'clamp(12px, 2dvh, 18px)',
        paddingTop: 'clamp(8px, 1.5dvh, 14px)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h1" size="lg">{roundTitle}</GradientTitle>
          <p style={S.subtitle}>
            {categoriesPlayed.length === 0
              ? 'La ruota decide la categoria — preparati!'
              : `Già giocato: ${categoriesPlayed.map((id) => ALL_CATEGORIES.find((c) => c.id === id)?.emoji).join(' ')}`}
          </p>
        </motion.div>

        {/* Settings card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={S.settingsCard}
        >
          <div style={S.settingRow}>
            <span style={S.settingLabel}>Domande per round</span>
            <Stepper
              value={questionsPerRound}
              onDecrement={() => isHost && handleQuestionsChange(questionsPerRound - 1)}
              onIncrement={() => isHost && handleQuestionsChange(questionsPerRound + 1)}
              disabled={!isHost || launching || !!spinTarget || roundIdx > 0}
              min={3} max={15}
            />
          </div>
          {roundIdx > 0 && (
            <p style={S.hint}>
              Impostazioni fissate per questa sessione 🔒
            </p>
          )}
        </motion.div>

        {/* Wheel — sincronizzata via spinTarget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', justifyContent: 'center', flex: 1, minHeight: 0, alignItems: 'center' }}
        >
          <CategoryWheel
            categories={availableCategories}
            spinTarget={spinTarget}
            onRequestSpin={handleRequestSpin}
            onSpinEnd={handleSpinEnd}
            disabled={launching}
            isHost={isHost}
          />
        </motion.div>
      </div>
    </div>
  )
}

const Stepper = ({ value, onDecrement, onIncrement, disabled, min, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <button
      type="button"
      onClick={onDecrement}
      disabled={disabled || value <= min}
      style={{ ...S.stepBtn, opacity: (disabled || value <= min) ? 0.4 : 1 }}
    >
      −
    </button>
    <span style={S.stepValue}>{value}</span>
    <button
      type="button"
      onClick={onIncrement}
      disabled={disabled || value >= max}
      style={{ ...S.stepBtn, opacity: (disabled || value >= max) ? 0.4 : 1 }}
    >
      +
    </button>
  </div>
)

const S = {
  roundBadge: {
    background: 'var(--bg2)',
    color: 'var(--accent)',
    fontWeight: 800,
    fontSize: 'clamp(11px, 1.4dvh, 13px)',
    padding: '5px 12px',
    borderRadius: 999,
    border: '1.5px solid rgba(124,58,237,0.18)',
    letterSpacing: '0.05em',
    minWidth: 44,
    textAlign: 'center',
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 500,
  },
  settingsCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'clamp(12px, 2dvh, 16px) clamp(14px, 3vw, 18px)',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    fontSize: 'clamp(13px, 1.5dvh, 15px)',
    fontWeight: 700,
    color: 'var(--text)',
  },
  hint: {
    margin: '8px 0 0',
    fontSize: 'clamp(11px, 1.3dvh, 12px)',
    color: 'var(--muted)',
    textAlign: 'center',
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: '1.5px solid var(--border-strong)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 18,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 'clamp(16px, 2dvh, 20px)',
    fontWeight: 900,
    color: 'var(--accent)',
  },
}

export default TriviaLobbyScreen
