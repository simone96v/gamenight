import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import FlappyBlobGame from './FlappyBlobGame'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import { BLOB_GRADIENTS } from '../../../utils/colors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { haptic } from '../../../utils/haptic'

const FlappyBlobPlaying = ({
  seed,
  blobColor,
  scoreSubmitted,
  onSubmitScore,
  localBest,
}) => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const scoreRef = useRef(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    haptic.tick()
  }, [])

  const handleDeath = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setDead(true)
    haptic.heavy()
    onSubmitScore?.(s)
  }, [onSubmitScore])

  useEffect(() => {
    if (dead && !scoreSubmitted) onSubmitScore?.(scoreRef.current)
  }, [dead, scoreSubmitted, onSubmitScore])

  const handleExit = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])
  const showBest = typeof localBest === 'number' && localBest > 0

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.gameArea}>
        <FlappyBlobGame
          ref={gameRef}
          seed={seed}
          blobColor={blobColor}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
        />

        <div style={S.hud} aria-live="polite" aria-atomic>
          <div style={S.scoreChip}>
            <span style={{ ...S.scoreArrow, color: accentLight }} aria-hidden="true">●</span>
            <span style={S.scoreValue}>{score}</span>
            <span style={S.scoreUnit}>pt</span>
          </div>
          {showBest && (
            <div style={S.bestChip} aria-label={`Record personale ${Math.max(localBest, score)}`}>
              <span style={{ ...S.bestLabel, color: accentLight }}>BEST</span>
              <span style={S.bestValue}>{Math.max(localBest, score)}</span>
            </div>
          )}
        </div>
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
    gap: 10,
    pointerEvents: 'none',
    zIndex: 10,
  },
  scoreChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 4,
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
  bestChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 6,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '4px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  bestLabel: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    lineHeight: 1,
  },
  bestValue: {
    fontSize: 15,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.92)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
}

export default FlappyBlobPlaying
