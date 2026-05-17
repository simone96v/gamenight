import { useState, useCallback, useRef } from 'react'
import CatchBlobGame from './components/CatchBlobGame'

const TEST_SEED = 17329401
const COLOR_OPTIONS = ['#8B5CF6', '#F59E0B', '#10B981', '#F43F5E', '#3B82F6', '#F97316', '#06B6D4', '#EC4899']
const DEATH_LABEL = {
  wrong_color: 'Hai preso un blob del colore sbagliato!',
  bomb: 'BOOM. Era una bomba.',
  missed_right: 'Ti è scappato un blob del tuo colore!',
}

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

const CatchBlobTest = () => {
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const [deathReason, setDeathReason] = useState(null)
  const [gameKey, setGameKey] = useState(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => setScore(s), [])
  const handleDeath = useCallback((s, reason) => {
    setScore(s)
    setDeathReason(reason)
    setDead(true)
  }, [])

  const restart = () => {
    setScore(0)
    setDead(false)
    setDeathReason(null)
    setGameKey((k) => k + 1)
  }

  const switchColor = (c) => {
    setColor(c)
    setScore(0)
    setDead(false)
    setDeathReason(null)
    setGameKey((k) => k + 1)
  }

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
        <CatchBlobGame
          ref={gameRef}
          key={`${gameKey}-${color}`}
          seed={TEST_SEED + gameKey}
          blobColor={color}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
        />

        {/* Score HUD */}
        <div style={styles.hud}>
          <div style={styles.scoreChip}>
            <span style={styles.scoreValue}>{score}</span>
            <span style={styles.scoreUnit}>pt</span>
          </div>
        </div>

        {/* Touch zones */}
        <HalfZone side={-1} gameRef={gameRef} disabled={dead} />
        <HalfZone side={1}  gameRef={gameRef} disabled={dead} />

        {/* Color picker (only while not playing) */}
        {dead && (
          <div style={styles.colorPicker}>
            <span style={styles.pickerLabel}>Cambia colore:</span>
            <div style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => switchColor(c)}
                  style={{
                    ...styles.colorDot,
                    background: c,
                    transform: c === color ? 'scale(1.2)' : 'scale(1)',
                    outline: c === color ? '2px solid #fff' : 'none',
                    outlineOffset: c === color ? 2 : 0,
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Death overlay */}
        {dead && (
          <div style={styles.deathOverlay}>
            <div style={styles.deathCard}>
              <div style={styles.deathTitle}>Game Over</div>
              <div style={styles.deathReason}>{DEATH_LABEL[deathReason] ?? 'Hai perso.'}</div>
              <div style={styles.deathScore}>
                <span style={styles.deathScoreValue}>{score}</span>
                <span style={styles.deathScoreUnit}>pt</span>
              </div>
              <button style={styles.restartBtn} onClick={restart}>Riprova</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
    overflow: 'hidden',
  },
  gameArea: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hud: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
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
    padding: '5px 16px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
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
  colorPicker: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    zIndex: 11,
  },
  pickerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: 700,
  },
  colorRow: {
    display: 'flex',
    gap: 8,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 120ms ease',
    padding: 0,
  },
  deathOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)',
    zIndex: 20,
  },
  deathCard: {
    background: '#1f2937',
    borderRadius: 20,
    padding: '28px 32px',
    minWidth: 240,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  deathTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  deathReason: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: 600,
  },
  deathScore: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  deathScoreValue: {
    fontSize: 56,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  deathScoreUnit: {
    fontSize: 18,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
  },
  restartBtn: {
    marginTop: 8,
    background: '#fff',
    color: '#111827',
    border: 'none',
    borderRadius: 999,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
  },
}

export default CatchBlobTest
