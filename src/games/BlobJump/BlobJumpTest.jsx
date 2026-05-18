import { useState, useCallback } from 'react'
import BlobJumpGame from './components/BlobJumpGame'

const TEST_SEED = 48291037
const TEST_COLOR = '#8B5CF6'
const DURATION = 60

const BlobJumpTest = () => {
  const [score, setScore] = useState(0)
  const [gameKey, setGameKey] = useState(0)

  const handleScore = useCallback((s) => setScore(s), [])
  const handleDeath = useCallback((s) => setScore(s), [])
  const handleTimeUp = useCallback((s) => setScore(s), [])

  const restart = () => {
    setScore(0)
    setGameKey((k) => k + 1)
  }

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
        <BlobJumpGame
          key={gameKey}
          seed={TEST_SEED}
          blobColor={TEST_COLOR}
          duration={DURATION}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
          onTimeUp={handleTimeUp}
        />

        <div style={styles.scoreOverlay}>
          <span style={styles.scoreValue}>{score}</span>
          <span style={styles.scoreUnit}>m</span>
        </div>

        <button onClick={restart} style={styles.restartBtn}>↻ Restart</button>
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
  restartBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    padding: '8px 14px',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    fontWeight: 700,
    cursor: 'pointer',
    zIndex: 10,
  },
}

export default BlobJumpTest
