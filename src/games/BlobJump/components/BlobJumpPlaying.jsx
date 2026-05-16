import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BlobJumpGame from './BlobJumpGame'
import BlobJumpDeath from './BlobJumpDeath'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import { BLOB_GRADIENTS } from '../../../utils/colors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { useSession } from '../../../stores/useSession'
import { pushRoom } from '../../../lib/room'

// ── Half-screen touch zone ──────────────────────────────────
const HalfZone = ({ side, gameRef, disabled }) => {
  const onStart = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    gameRef.current?.getEngine()?.input?.setExternalDirection(side)
  }, [side, disabled, gameRef])

  const onEnd = useCallback((e) => {
    e.preventDefault()
    gameRef.current?.getEngine()?.input?.clearExternalDirection()
  }, [gameRef])

  return (
    <div
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        ...(side < 0 ? { left: 0, right: '50%' } : { left: '50%', right: 0 }),
        zIndex: 5,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: side < 0 ? 'flex-start' : 'flex-end',
        padding: 'clamp(16px, 3dvh, 28px) clamp(20px, 5vw, 32px)',
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 'clamp(22px, 4dvh, 32px)',
        fontWeight: 900,
        color: 'rgba(0,0,0,0.13)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {side < 0 ? '←' : '→'}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────
const BlobJumpPlaying = ({
  seed,
  blobColor,
  isExpired,
  scoreSubmitted,
  onSubmitScore,
  onUpdateScore,
  players,
  localPlayerId,
  isOnline,
  isHost,
  onGoToClassifica,
}) => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const scoreRef = useRef(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    onUpdateScore?.(s)
  }, [onUpdateScore])

  const handleDeath = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setDead(true)
    onSubmitScore(s)
  }, [onSubmitScore])

  const handleTimeUp = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    onSubmitScore(s)
  }, [onSubmitScore])

  // Server timer expired — submit if not already done
  useEffect(() => {
    if (isExpired && !scoreSubmitted && !dead) {
      onSubmitScore(scoreRef.current)
    }
  }, [isExpired, scoreSubmitted, dead, onSubmitScore])

  const handleExit = useCallback(() => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: s.players,
      currentIdx: s.currentIdx,
      round: s.round,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])
  const ctrlDisabled = dead || !!isExpired

  return (
    <div style={S.container}>
      {/* ── App header ── */}
      <AppHeader
        accentColor={C.accent}
        leading={isHost && <IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      {/* ── Game area (fullscreen below header) ── */}
      <div style={S.gameArea}>
        <BlobJumpGame
          ref={gameRef}
          seed={seed}
          blobColor={blobColor}
          duration={0}
          forceStop={false}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
          onTimeUp={handleTimeUp}
        />

        {/* Score HUD */}
        <div style={S.hud} aria-live="polite" aria-atomic>
          <div style={S.scoreChip}>
            <span style={{ ...S.scoreArrow, color: accentLight }} aria-hidden="true">↑</span>
            <span style={S.scoreValue}>{score}</span>
            <span style={S.scoreUnit}>m</span>
          </div>
        </div>

        {/* Left / right half-screen touch zones */}
        <HalfZone side={-1} gameRef={gameRef} disabled={ctrlDisabled} />
        <HalfZone side={1}  gameRef={gameRef} disabled={ctrlDisabled} />

        {/* Death overlay — rendered on top (zIndex > 5) */}
        {dead && (
          <BlobJumpDeath
            score={score}
            blobColor={blobColor}
            onAction={!isOnline ? onGoToClassifica : undefined}
            actionLabel="Classifica 🏆"
            waitingMessage={isOnline ? 'Aspettando gli altri...' : undefined}
          />
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    background: '#F8F6F0',
  },
  gameArea: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  hud: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  scoreChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 3,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '5px 16px 5px 11px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
  },
  scoreArrow: {
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
    marginRight: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  scoreUnit: {
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.48)',
  },
}

export default BlobJumpPlaying
