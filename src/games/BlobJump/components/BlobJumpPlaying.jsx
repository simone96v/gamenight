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
  const touchRef = useRef(null)
  const deadRef = useRef(false)
  useEffect(() => { deadRef.current = dead }, [dead])

  // Native touch listeners on the overlay — guaranteed non-passive
  useEffect(() => {
    const el = touchRef.current
    if (!el) return

    const getDir = (x) => x < window.innerWidth / 2 ? -1 : 1

    const onStart = (e) => {
      e.preventDefault()
      if (deadRef.current) return
      const dir = getDir(e.touches[0].clientX)
      gameRef.current?.getEngine()?.input?.setExternalDirection(dir)
    }
    const onMove = (e) => {
      e.preventDefault()
      if (deadRef.current) return
      const dir = getDir(e.touches[0].clientX)
      gameRef.current?.getEngine()?.input?.setExternalDirection(dir)
    }
    const onEnd = (e) => {
      e.preventDefault()
      gameRef.current?.getEngine()?.input?.clearExternalDirection()
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    el.addEventListener('touchcancel', onEnd, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [seed])

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

        {/* Full-screen touch overlay for left/right control */}
        <div ref={touchRef} style={S.touchOverlay}>
          <span style={S.hintArrow}>←</span>
          <span style={S.hintArrow}>→</span>
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
  touchOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 'clamp(16px, 3dvh, 28px) clamp(20px, 5vw, 36px)',
    zIndex: 5,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  hintArrow: {
    fontSize: 'clamp(22px, 4dvh, 32px)',
    fontWeight: 900,
    color: 'rgba(0,0,0,0.15)',
    pointerEvents: 'none',
    userSelect: 'none',
  },
}

export default BlobJumpPlaying
