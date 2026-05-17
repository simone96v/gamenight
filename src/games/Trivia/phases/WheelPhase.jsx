// Fase "wheel" — la ruota delle categorie vive nello schermo di gioco, non in lobby.
// Ogni round inizia qui: header (Round X/Y + exit), wheel, indicatore spinner, spin button.
// Dopo il landing, l'host scarica il deck e transita a 'countdown'.

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import CategoryWheel from '../../../components/CategoryWheel'
import BlobLoader from '../../../components/BlobLoader'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import { useSession } from '../../../stores/useSession'
import { useSettings } from '../../../stores/useSettings'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { pushRoom, rpcStartGame } from '../../../lib/room'
import { getDeck } from '../../../lib/aiQuestions'
import { TRIVIA_CATEGORIES } from '../constants'
import { useNavigate } from 'react-router-dom'

const WheelPhase = ({ onExit }) => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  const mode          = useSession((s) => s.mode)
  const isHost        = useSession((s) => s.isHost)
  const roomCode      = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const players       = useSession((s) => s.players)
  const gameState     = useSession((s) => s.gameState)
  const showError     = useSession((s) => s.showError)
  const timerDuration = useSettings((s) => s.timerDuration)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo

  const session           = gameState?.triviaSession ?? null
  const roundIdx          = session?.roundIdx ?? 0
  const totalRounds       = session?.totalRounds ?? 1
  const questionsPerRound = session?.questionsPerRound ?? 0
  const categoriesPlayed  = session?.categoriesPlayed ?? []
  const spinTarget        = session?.spinTarget ?? null
  const launching         = session?.launching ?? false

  const launchingRef = useRef(false)
  useEffect(() => { launchingRef.current = launching }, [launching])
  useEffect(() => { launchingRef.current = false }, [])

  // Spinner: deterministico da roomCode + roundIdx (stessa formula della vecchia lobby).
  const currentSpinner = useMemo(() => {
    if (players.length === 0) return null
    const seed = (roomCode || '').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
    const idx = Math.abs(seed + roundIdx * 7919) % players.length
    return players[idx]?.id ?? null
  }, [roomCode, roundIdx, players])

  const isSpinner = localPlayerId === currentSpinner
  const spinnerPlayer = players.find((p) => p.id === currentSpinner)

  const availableCategories = useMemo(
    () => TRIVIA_CATEGORIES.filter((c) => !categoriesPlayed.includes(c.id)),
    [categoriesPlayed],
  )

  const handleRequestSpin = useCallback(() => {
    if (!isSpinner || launchingRef.current || spinTarget) return
    if (availableCategories.length === 0) return

    const winIdx = Math.floor(Math.random() * availableCategories.length)
    const winner = availableCategories[winIdx]

    const s = useSession.getState()
    const newSession = { ...(s.gameState?.triviaSession ?? {}), spinTarget: winner.id }
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
  }, [isSpinner, spinTarget, availableCategories])

  const setLaunchingState = useCallback((value) => {
    const s = useSession.getState()
    const newSession = { ...(s.gameState?.triviaSession ?? {}), launching: value }
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
  }, [])

  const handleSpinEnd = useCallback(async (category) => {
    if (!canControl || launchingRef.current) return
    launchingRef.current = true

    const s = useSession.getState()
    const freshSession = s.gameState?.triviaSession ?? {}
    const freshCategoriesPlayed = freshSession.categoriesPlayed ?? []
    const freshRoundIdx = freshSession.roundIdx ?? 0
    const freshQuestionsPerRound = freshSession.questionsPerRound ?? questionsPerRound

    const launchSession = {
      ...freshSession,
      categoriesPlayed: [...freshCategoriesPlayed, category.id],
      currentCategory: category.id,
      spinTarget: null,
      launching: true,
    }
    const launchGameState = { ...s.gameState, triviaSession: launchSession }
    useSession.setState({ gameState: launchGameState })

    try {
      const deckData = await getDeck(category.id, freshQuestionsPerRound)
      const resetScores = freshRoundIdx === 0

      if (s.mode === 'online' && s.roomCode) {
        const startResult = await rpcStartGame(s.roomCode, deckData, timerDuration, resetScores)
        if (startResult.error) {
          console.error('[trivia-wheel] startGame:', startResult.error)
          showError('generic')
          setLaunchingState(false)
          launchingRef.current = false
        }
      } else {
        const resetPlayers = resetScores
          ? (s.players || []).map((p) => ({
              ...p, score: 0, current_streak: 0, best_streak: 0,
              correct_count: 0, total_speed_ms: 0,
            }))
          : s.players
        const now = new Date().toISOString()
        useSession.setState({
          players: resetPlayers,
          gameState: {
            deck: deckData,
            current_round: 0,
            current_question: deckData[0],
            round_results: {},
            triviaSession: launchSession,
          },
          currentPhase: 'countdown',
          questionStartedAt: now,
          activeGame: 'trivia',
        })
        navigate('/game/trivia', { replace: true })
      }
    } catch (err) {
      console.error('[trivia-wheel] handleSpinEnd:', err)
      showError('generic')
      setLaunchingState(false)
      launchingRef.current = false
    }
  }, [canControl, questionsPerRound, timerDuration, showError, setLaunchingState, navigate])

  if (launching) {
    return <BlobLoader text="Preparando le domande..." />
  }

  const showRoundBadge = totalRounds > 1
  const spinnerLabel = isSpinner
    ? 'Tocca a te!'
    : spinnerPlayer
      ? `Tocca a ${spinnerPlayer.name}`
      : 'In attesa...'

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={canControl && onExit ? (
          <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>
        ) : null}
      />

      <div style={S.body}>
        {/* Round badge */}
        {showRoundBadge && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />
          </motion.div>
        )}

        {/* Spinner indicator + blob attivo — bordo + label tintati col color giocatore */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{
            ...S.spinnerCard,
            borderColor: `${C.accent}40`,
            boxShadow: `0 4px 14px ${C.accent}22, var(--shadow-sm)`,
          }}
        >
          {spinnerPlayer && (
            <div style={S.spinnerBlob}>
              <MiniBlob
                color={spinnerPlayer.color}
                expr={expr}
                size={56}
                id={`spinner-${spinnerPlayer.id}`}
              />
            </div>
          )}
          <span style={{ ...S.spinnerLabel, color: C.accent }}>{spinnerLabel}</span>
          <p style={S.spinnerHint}>
            {isSpinner ? 'Gira la ruota per scoprire la categoria' : 'Aspetta lo spin...'}
          </p>
        </motion.div>

        {/* Categorie giocate (chip indicator) */}
        {categoriesPlayed.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={S.playedRow}
          >
            <span style={S.playedLabel}>Giocate:</span>
            {categoriesPlayed.map((id) => {
              const cat = TRIVIA_CATEGORIES.find((c) => c.id === id)
              if (!cat) return null
              return (
                <span key={id} style={S.playedChip} title={cat.label}>
                  {cat.emoji}
                </span>
              )
            })}
          </motion.div>
        )}

        {/* Wheel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          style={S.wheelWrap}
        >
          <CategoryWheel
            categories={availableCategories}
            spinTarget={spinTarget}
            onRequestSpin={handleRequestSpin}
            onSpinEnd={handleSpinEnd}
            disabled={launching || !!spinTarget}
            canSpin={isSpinner}
            spinnerName={spinnerPlayer?.name ?? ''}
            accentColor={C.accent}
          />
        </motion.div>
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(12px, 2dvh, 20px)',
    overflow: 'auto',
    alignItems: 'center',
  },
  spinnerCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: 'clamp(12px, 2dvh, 18px) clamp(16px, 3vw, 22px)',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  spinnerBlob: {
    marginBottom: 2,
  },
  spinnerLabel: {
    display: 'block',
    fontSize: 'clamp(18px, 2.6dvh, 24px)',
    fontWeight: 900,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
    fontFamily: "'Baloo 2', cursive",
  },
  spinnerHint: {
    margin: '4px 0 0',
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 600,
    color: 'var(--muted)',
  },
  playedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playedLabel: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  playedChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    fontSize: 16,
    lineHeight: 1,
    opacity: 0.7,
  },
  wheelWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
}

export default WheelPhase
