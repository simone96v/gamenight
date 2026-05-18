import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import SnakeGame from './SnakeGame'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import { BLOB_GRADIENTS } from '../../../utils/colors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { haptic } from '../../../utils/haptic'

// Zona invisibile sopra le quattro frecce — quando l'utente preme,
// imposta direttamente la direzione (più diretto dello swipe sul corpo del gioco).
const DPadButton = ({ dir, label, style, gameRef }) => {
  const press = useCallback((e) => {
    e.preventDefault()
    gameRef.current?.getEngine()?.setDirection(dir)
    haptic.tick()
  }, [dir, gameRef])

  return (
    <button
      type="button"
      onPointerDown={press}
      style={{
        ...style,
        appearance: 'none',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#fff',
        borderRadius: 14,
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'none',
      }}
      aria-label={`Direzione ${dir}`}
    >
      {label}
    </button>
  )
}

const SnakePlaying = ({
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
  }, [])

  const handleEat = useCallback(() => {
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
        <SnakeGame
          ref={gameRef}
          seed={seed}
          blobColor={blobColor}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
          onEat={handleEat}
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

        {/* D-pad fluttuante per mobile (anche su desktop comodo). */}
        <div style={S.dpad}>
          <DPadButton gameRef={gameRef} dir="up" label="▲" style={{ ...S.dpadCell, gridArea: 'up' }} />
          <DPadButton gameRef={gameRef} dir="left" label="◀" style={{ ...S.dpadCell, gridArea: 'left' }} />
          <DPadButton gameRef={gameRef} dir="right" label="▶" style={{ ...S.dpadCell, gridArea: 'right' }} />
          <DPadButton gameRef={gameRef} dir="down" label="▼" style={{ ...S.dpadCell, gridArea: 'down' }} />
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
  dpad: {
    position: 'absolute',
    bottom: 'clamp(14px, 3dvh, 28px)',
    right: 'clamp(14px, 4vw, 28px)',
    display: 'grid',
    gridTemplateColumns: '46px 46px 46px',
    gridTemplateRows: '46px 46px 46px',
    gridTemplateAreas: `
      ".    up   ."
      "left .    right"
      ".    down ."
    `,
    gap: 6,
    zIndex: 8,
    pointerEvents: 'auto',
  },
  dpadCell: {
    width: 46,
    height: 46,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

export default SnakePlaying
