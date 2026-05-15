import { useState, useCallback, useRef, useEffect } from 'react'
import { GAME_COLORS } from '../../../theme/gameColors'
import BlobJumpGame from './BlobJumpGame'
import BlobJumpDeath from './BlobJumpDeath'
import TouchSlider from './TouchSlider'

const C = GAME_COLORS.blobjump

// Detect touch-capable device (mobile/tablet)
const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const BlobJumpPlaying = ({
  seed,
  blobColor,
  isExpired,
  scoreSubmitted,
  onSubmitScore,
  onUpdateScore,
  players,
  localPlayerId,
}) => {
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const scoreRef = useRef(0)
  const gameRef = useRef(null)
  const sliderConnected = useRef(false)

  // Connect slider to engine input once engine is ready
  useEffect(() => {
    if (!IS_TOUCH || sliderConnected.current) return
    const check = setInterval(() => {
      const engine = gameRef.current?.getEngine()
      if (engine?.input) {
        engine.input.disableCanvasTouch()
        sliderConnected.current = true
        clearInterval(check)
      }
    }, 50)
    return () => clearInterval(check)
  }, [seed])

  const handleSliderChange = useCallback((dir) => {
    const engine = gameRef.current?.getEngine()
    engine?.input?.setExternalDirection(dir)
  }, [])

  const handleSliderRelease = useCallback(() => {
    const engine = gameRef.current?.getEngine()
    engine?.input?.clearExternalDirection()
  }, [])

  // Keep player.score in sync with live score for GameHUD chips
  const playersWithLive = (players || []).map((p) =>
    p.id === localPlayerId ? { ...p, score } : p,
  )

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

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
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

        {/* Score overlay on canvas */}
        <div style={styles.scoreOverlay}>
          <span style={styles.scoreValue}>{score}</span>
          <span style={styles.scoreUnit}>m</span>
        </div>

        {dead && (
          <BlobJumpDeath
            score={score}
            blobColor={blobColor}
          />
        )}
      </div>

      {/* Mobile touch slider controller */}
      {IS_TOUCH && (
        <div style={styles.sliderWrap}>
          <TouchSlider
            onChange={handleSliderChange}
            onRelease={handleSliderRelease}
            accentColor={C.accent}
            disabled={dead || isExpired}
          />
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    background: '#0f0a1e',
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
  scoreOverlay: {
    position: 'absolute',
    top: 10,
    left: 14,
    display: 'flex',
    alignItems: 'baseline',
    gap: 2,
    pointerEvents: 'none',
    zIndex: 10,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 900,
    color: '#fff',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
    letterSpacing: '-0.02em',
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    textShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  sliderWrap: {
    flexShrink: 0,
    padding: 'clamp(8px, 1.5dvh, 14px) clamp(16px, 4vw, 28px)',
    paddingBottom: 'max(env(safe-area-inset-bottom, 8px), clamp(8px, 1.5dvh, 14px))',
    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
  },
}

export default BlobJumpPlaying
