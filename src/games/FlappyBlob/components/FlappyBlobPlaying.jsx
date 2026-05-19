import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [started, setStarted] = useState(false)
  const [bumpKey, setBumpKey] = useState(0)
  const scoreRef = useRef(0)
  const gameRef = useRef(null)

  const handleScore = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setBumpKey((k) => k + 1)
    haptic.tick()
  }, [])

  const handleDeath = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setDead(true)
    haptic.heavy()
    onSubmitScore?.(s)
  }, [onSubmitScore])

  const handleStart = useCallback(() => {
    setStarted(true)
  }, [])

  useEffect(() => {
    if (dead && !scoreSubmitted) onSubmitScore?.(scoreRef.current)
  }, [dead, scoreSubmitted, onSubmitScore])

  const handleExit = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])
  const accentMid = useMemo(() => BLOB_GRADIENTS[blobColor]?.[1] || blobColor, [blobColor])
  const showBest = typeof localBest === 'number' && localBest > 0
  const bestValue = Math.max(localBest || 0, score)
  const isNewBest = score > 0 && score >= bestValue && bestValue > (localBest || 0)

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
          onStart={handleStart}
        />

        <div style={S.hud} aria-live="polite" aria-atomic>
          <motion.div
            key={`score-${bumpKey}`}
            initial={started ? { scale: 1.18 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            style={{
              ...S.scoreChip,
              boxShadow: `0 4px 22px ${accentMid}33, 0 1px 0 rgba(255,255,255,0.08) inset`,
            }}
          >
            <span
              style={{
                ...S.scoreDot,
                background: accentLight,
                boxShadow: `0 0 10px ${accentLight}cc`,
              }}
              aria-hidden="true"
            />
            <span style={S.scoreValue}>{score}</span>
          </motion.div>

          {showBest && (
            <div
              style={{
                ...S.bestChip,
                borderColor: isNewBest ? accentLight : 'rgba(255,255,255,0.10)',
                boxShadow: isNewBest ? `0 0 0 2px ${accentLight}55` : '0 2px 10px rgba(0,0,0,0.25)',
              }}
              aria-label={`Record personale ${bestValue}`}
            >
              <span style={{ ...S.bestLabel, color: accentLight }}>
                {isNewBest ? 'NEW' : 'BEST'}
              </span>
              <span style={S.bestValue}>{bestValue}</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {!started && !dead && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={S.instructionsWrap}
            >
              <div
                style={{
                  ...S.instructionsCard,
                  borderColor: `${accentLight}66`,
                  boxShadow: `0 18px 60px ${accentMid}33, 0 0 0 1px ${accentLight}22 inset`,
                }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    ...S.tapIcon,
                    background: `linear-gradient(135deg, ${accentLight}, ${accentMid})`,
                  }}
                >
                  👆
                </motion.div>
                <div style={S.instructionsTitle}>Tocca per volare</div>
                <div style={S.instructionsRow}>
                  <span style={S.kbd}>TAP</span>
                  <span style={S.instructionsSep}>oppure</span>
                  <span style={S.kbd}>SPAZIO</span>
                </div>
                <div style={S.instructionsHint}>
                  Supera gli ostacoli, conta le pipe!
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
    top: 16,
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
    alignItems: 'center',
    gap: 9,
    background: 'rgba(15,17,23,0.78)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    padding: '7px 18px 7px 13px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  scoreValue: {
    fontFamily: "'Baloo 2', system-ui, sans-serif",
    fontSize: 30,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    minWidth: 18,
    textAlign: 'center',
  },
  bestChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(15,17,23,0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '5px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.10)',
    transition: 'box-shadow 220ms ease',
  },
  bestLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.10em',
    lineHeight: 1,
  },
  bestValue: {
    fontSize: 15,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.92)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  instructionsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '14%',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 9,
    padding: '0 18px',
  },
  instructionsCard: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.86)',
    backdropFilter: 'blur(18px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
    border: '1px solid',
    borderRadius: 22,
    padding: '20px 26px 18px',
    minWidth: 240,
    maxWidth: 320,
  },
  tapIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    color: '#fff',
    boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
    marginBottom: 2,
  },
  instructionsTitle: {
    fontFamily: "'Baloo 2', system-ui, sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  instructionsRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#0F172A',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    padding: '4px 9px',
    borderRadius: 7,
    boxShadow: '0 2px 0 rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.08) inset',
  },
  instructionsSep: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.04em',
  },
  instructionsHint: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
}

export default FlappyBlobPlaying
