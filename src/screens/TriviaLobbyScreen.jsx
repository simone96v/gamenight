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
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { pushRoom, rpcStartGame } from '../lib/room'
import { getCachedDeck, generateDeck } from '../lib/aiQuestions'
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

  // Spinner determinato da roomCode + roundIdx — tutti i client lo calcolano uguale.
  const currentSpinner = useMemo(() => {
    if (players.length === 0) return null
    const seed = (roomCode || '').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
    const idx = Math.abs(seed + roundIdx * 7919) % players.length
    return players[idx]?.id ?? null
  }, [roomCode, roundIdx, players])

  const isSpinner = localPlayerId === currentSpinner
  const spinnerPlayer = players.find((p) => p.id === currentSpinner)

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
    // Cache non viene svuotata: i deck pre-generati dalla lobby servono per tutta la session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost])

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

  // Spinner clicca Spin → sceglie vincitore → pusha spinTarget su DB.
  const handleRequestSpin = useCallback(() => {
    if (!isSpinner || launching || spinTarget) return
    if (availableCategories.length === 0) return

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
  }, [isSpinner, launching, spinTarget, availableCategories])

  // Animazione completata — il deck è già in cache dalla lobby.
  // getCachedDeck è sincrono → zero attesa. Fallback a generateDeck solo in emergenza.
  const handleSpinEnd = useCallback(async (category) => {
    if (!isHost || launching) return
    setLaunching(true)
    try {
      const deck = getCachedDeck(category.id, questionsPerRound)
        ?? await generateDeck(category.id, questionsPerRound)

      const s = useSession.getState()
      const newSession = {
        ...(s.gameState?.triviaSession ?? {}),
        categoriesPlayed: [...categoriesPlayed, category.id],
        currentCategory: category.id,
        spinTarget: null,
      }
      const newGameState = { ...s.gameState, triviaSession: newSession }
      useSession.setState({ gameState: newGameState })

      const resetScores = roundIdx === 0

      // Lancia pushRoom + rpcStartGame in parallelo — dimezza latenza
      const [, startResult] = await Promise.all([
        pushRoom(s.roomCode, s.currentPhase, {
          players: s.players,
          currentIdx: s.currentIdx,
          round: s.round,
          activeGame: s.activeGame,
          ...newGameState,
        }),
        rpcStartGame(roomCode, deck, timerDuration, resetScores),
      ])

      if (startResult.error) {
        console.error('[trivia-lobby] startGame:', startResult.error)
        showError('generic')
        setLaunching(false)
      }
    } catch (err) {
      console.error('[trivia-lobby] handleSpinEnd:', err)
      showError('generic')
      setLaunching(false)
    }
  }, [isHost, launching, questionsPerRound, categoriesPlayed, roundIdx, roomCode, timerDuration, showError])

  const roundTitles = ['🎬 Round 1', '🎯 Round 2', '🏆 Round Finale']
  const roundTitle = roundTitles[roundIdx] ?? `Round ${roundIdx + 1}`

  if (launching) {
    return <BlobLoader text="Preparando le domande..." />
  }

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
        gap: 'clamp(10px, 1.5dvh, 14px)',
        paddingTop: 'clamp(4px, 1dvh, 10px)',
      }}>
        {/* Title + subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h1" size="lg">{roundTitle}</GradientTitle>
          <p style={S.subtitle}>
            {categoriesPlayed.length === 0
              ? 'La ruota decide la categoria!'
              : `Giocate: ${categoriesPlayed.map((id) => ALL_CATEGORIES.find((c) => c.id === id)?.emoji).join(' ')}`}
          </p>
        </motion.div>

        {/* Players strip */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          style={S.playersStrip}
        >
          {players.map((p) => (
            <div key={p.id} style={S.playerChip}>
              <div style={{ ...S.playerDot, backgroundColor: p.color }} />
              <span style={S.playerName}>{p.name}</span>
            </div>
          ))}
        </motion.div>

        {/* Settings row compatta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={S.settingsCard}
        >
          <div style={S.settingRow}>
            <span style={S.settingLabel}>Domande</span>
            <Stepper
              value={questionsPerRound}
              onDecrement={() => isHost && handleQuestionsChange(questionsPerRound - 1)}
              onIncrement={() => isHost && handleQuestionsChange(questionsPerRound + 1)}
              disabled={!isHost || launching || !!spinTarget || roundIdx > 0}
              min={3} max={15}
            />
          </div>
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
            disabled={launching || !!spinTarget}
            canSpin={isSpinner}
            spinnerName={spinnerPlayer?.name ?? ''}
          />
        </motion.div>
      </div>
    </div>
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
        whileHover={decDisabled ? undefined : { scale: 1.1, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
        whileTap={decDisabled ? undefined : { scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{ ...S.stepBtn, opacity: decDisabled ? 0.4 : 1 }}
      >
        −
      </motion.button>
      <span style={S.stepValue}>{value}</span>
      <motion.button
        type="button"
        onClick={onIncrement}
        disabled={incDisabled}
        whileHover={incDisabled ? undefined : { scale: 1.1, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
        whileTap={incDisabled ? undefined : { scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{ ...S.stepBtn, opacity: incDisabled ? 0.4 : 1 }}
      >
        +
      </motion.button>
    </div>
  )
}

const S = {
  roundBadge: {
    background: 'var(--bg2)',
    color: 'var(--accent)',
    fontWeight: 800,
    fontSize: 'clamp(11px, 1.4dvh, 13px)',
    padding: '5px 12px',
    borderRadius: 999,
    border: '1.5px solid rgba(0,0,0,0.18)',
    letterSpacing: '0.05em',
    minWidth: 44,
    textAlign: 'center',
  },
  subtitle: {
    margin: '4px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 500,
  },
  playersStrip: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  playerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    padding: '4px 10px 4px 6px',
  },
  playerDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--text)',
    maxWidth: 70,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  settingsCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(14px, 3vw, 18px)',
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
  stepBtn: {
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
  },
  stepValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 'clamp(15px, 1.8dvh, 19px)',
    fontWeight: 900,
    color: 'var(--accent)',
  },
}

export default TriviaLobbyScreen
