import { useState, useCallback, useRef, useEffect } from 'react'
import BlobDashGame from './components/BlobDashGame'
import BlobDashDeath from './components/BlobDashDeath'

const TEST_SEED = 48291037
const TEST_COLOR = '#8B5CF6'

const BlobDashTest = () => {
  const [score, setScore] = useState(0)
  const [dead, setDead] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => setScore(s), [])
  const handleDeath = useCallback((s) => {
    setScore(s)
    setDead(true)
  }, [])

  const restart = () => {
    setScore(0)
    setDead(false)
    setGameKey((k) => k + 1)
  }

  const handleTap = useCallback((e) => {
    e.preventDefault()
    gameRef.current?.requestJump()
  }, [])

  // R per restart rapido durante test.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'r' || e.key === 'R') && dead) restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dead])

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
        <BlobDashGame
          ref={gameRef}
          key={gameKey}
          seed={TEST_SEED}
          blobColor={TEST_COLOR}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
        />

        {/* Tap ovunque → jump */}
        {!dead && (
          <div
            onTouchStart={handleTap}
            onMouseDown={handleTap}
            style={styles.tapZone}
          />
        )}

        <div style={styles.scoreOverlay}>
          <span style={styles.scoreValue}>{score}</span>
          <span style={styles.scoreUnit}>m</span>
        </div>

        {dead && (
          <BlobDashDeath score={score} blobColor={TEST_COLOR} onRestart={restart} />
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
    background: '#0f0a1e',
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
  tapZone: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
    touchAction: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
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
}

export default BlobDashTest
