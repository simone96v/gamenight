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

// ── Overlay arrow button ─────────────────────────────────
const ArrowBtn = ({ dir, gameRef, disabled, accent, accentLight }) => {
  const [pressed, setPressed] = useState(false)

  const start = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    setPressed(true)
    gameRef.current?.getEngine()?.input?.setExternalDirection(dir)
  }, [dir, disabled, gameRef])

  const end = useCallback((e) => {
    e.preventDefault()
    setPressed(false)
    gameRef.current?.getEngine()?.input?.clearExternalDirection()
  }, [gameRef])

  return (
    <button
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      aria-label={dir < 0 ? 'Sinistra' : 'Destra'}
      style={{
        ...S.arrowBtn,
        background: pressed
          ? `linear-gradient(135deg, ${accent}, ${accentLight})`
          : `linear-gradient(135deg, ${accent}cc, ${accentLight}cc)`,
        boxShadow: pressed
          ? `0 2px 8px ${accent}50`
          : `0 4px 16px ${accent}30`,
        opacity: disabled ? 0.25 : 1,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {dir < 0 ? (
          <path
            d="M20 8L12 16L20 24"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M12 8L20 16L12 24"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
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

  // Disable canvas-touch so overlay arrow buttons are the primary touch input
  useEffect(() => {
    const check = setInterval(() => {
      const engine = gameRef.current?.getEngine()
      if (engine?.input) {
        engine.input.disableCanvasTouch()
        clearInterval(check)
      }
    }, 50)
    return () => clearInterval(check)
  }, [seed])

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

  const ctrlDisabled = dead || !!isExpired
  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])

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

        {/* Overlay arrow controls */}
        <div style={S.controls}>
          <ArrowBtn dir={-1} gameRef={gameRef} disabled={ctrlDisabled} accent={C.accent} accentLight={accentLight} />
          <ArrowBtn dir={1} gameRef={gameRef} disabled={ctrlDisabled} accent={C.accent} accentLight={accentLight} />
        </div>

        {/* Death overlay */}
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
  controls: {
    position: 'absolute',
    bottom: 'clamp(12px, 2dvh, 20px)',
    left: 'clamp(12px, 3vw, 20px)',
    right: 'clamp(12px, 3vw, 20px)',
    display: 'flex',
    gap: 'clamp(8px, 2vw, 14px)',
    zIndex: 10,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    pointerEvents: 'none',
  },
  arrowBtn: {
    flex: 1,
    height: 'clamp(56px, 9dvh, 76px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 'clamp(14px, 2.5vw, 20px)',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 0.08s ease, box-shadow 0.08s ease',
    pointerEvents: 'auto',
  },
}

export default BlobJumpPlaying
