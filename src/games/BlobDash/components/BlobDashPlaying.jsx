import { useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BlobDashGame from './BlobDashGame'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import { BLOB_GRADIENTS } from '../../../utils/colors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

// Tap zone fullscreen: ovunque sotto l'header = jump.
const TapZone = ({ gameRef, disabled }) => {
  const onPress = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    gameRef.current?.getEngine()?.input?.triggerJump()
  }, [disabled, gameRef])

  return (
    <div
      onTouchStart={onPress}
      onMouseDown={onPress}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
    />
  )
}

const BlobDashPlaying = ({ seed, blobColor, scoreSubmitted, onSubmitScore }) => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const scoreRef = useRef(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
  }, [])

  const handleDeath = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setDead(true)
    onSubmitScore(s)
  }, [onSubmitScore])

  const handleExit = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])
  const ctrlDisabled = dead || scoreSubmitted

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.gameArea}>
        <BlobDashGame
          ref={gameRef}
          seed={seed}
          blobColor={blobColor}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
        />

        <div style={S.hud} aria-live="polite" aria-atomic>
          <div style={S.scoreChip}>
            <span style={{ ...S.scoreArrow, color: accentLight }} aria-hidden="true">→</span>
            <span style={S.scoreValue}>{score}</span>
            <span style={S.scoreUnit}>m</span>
          </div>
        </div>

        <TapZone gameRef={gameRef} disabled={ctrlDisabled} />
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

export default BlobDashPlaying
