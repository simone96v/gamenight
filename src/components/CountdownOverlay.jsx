// Full-screen countdown overlay: 3 - 2 - 1 - VIA!
// Driven by questionStartedAt from server. Calls onComplete when done.
// Standardized grayscale design with colored player blobs, light/dark mode aware.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '../utils/haptic'
import { useSfx } from '../hooks/useSfx'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const STEPS = [
  { label: '3', delay: 0 },
  { label: '2', delay: 1 },
  { label: '1', delay: 2 },
  { label: 'VIA!', delay: 3 },
]

const CountdownOverlay = ({
  questionStartedAt,
  onComplete,
  players = [],
  localPlayerId,
  category,       // { id, label, emoji, color }
  gameName,        // es. "Trivia", "Mappa" — shown if no category
  gameEmoji,       // es. "🧠", "📍" — shown if no category
}) => {
  const C = usePlayerAccent()
  const playSfx = useSfx()
  const [stepIndex, setStepIndex] = useState(-1)
  const completedRef = useRef(false)
  const lastHapticStep = useRef(-1)

  useEffect(() => {
    if (!questionStartedAt) return
    completedRef.current = false
    lastHapticStep.current = -1

    const startMs = new Date(questionStartedAt).getTime()

    const tick = () => {
      const elapsed = (Date.now() - startMs) / 1000
      const idx = Math.floor(elapsed)

      if (idx >= STEPS.length) {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
        return
      }

      if (idx !== lastHapticStep.current) {
        lastHapticStep.current = idx
        if (idx === 3) { haptic.heavy(); playSfx('confirm') }
        else { haptic.tick(); playSfx('tap', { volume: 0.5 }) }
      }

      setStepIndex(idx)
      requestAnimationFrame(tick)
    }

    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [questionStartedAt, onComplete])

  const step = STEPS[stepIndex]
  const isVia = stepIndex === 3

  // Badge info: category if available, otherwise game name
  const badgeEmoji = category?.emoji || gameEmoji
  const badgeLabel = category?.label || gameName

  return (
    <div style={S.overlay}>
      {/* Game/Category badge at the top */}
      {badgeLabel && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={S.badge}
        >
          {badgeEmoji && <span style={S.badgeEmoji}>{badgeEmoji}</span>}
          <span style={S.badgeLabel}>{badgeLabel}</span>
        </motion.div>
      )}

      {/* Main countdown number */}
      <div style={S.centerArea}>
        <AnimatePresence mode="wait">
          {step && (
            <motion.div
              key={step.label}
              initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                ...S.label,
                color: C.accent,
                textShadow: `0 0 60px ${C.shadow}, 0 0 120px ${C.shadowLight}`,
                ...(isVia ? {
                  background: C.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                } : {}),
              }}
            >
              {step.label}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring behind the number */}
        <AnimatePresence>
          {step && !isVia && (
            <motion.div
              key={`ring-${step.label}`}
              initial={{ scale: 0.5, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ ...S.pulseRing, borderColor: C.accent }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Player blobs row */}
      {players.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={S.playersRow}
        >
          {players.map((p, i) => {
            const isLocal = p.id === localPlayerId
            return (
              <motion.div
                key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 400, damping: 20 }}
                style={S.playerCol}
              >
                <div style={{
                  ...S.blobCircle,
                  background: `linear-gradient(135deg, ${p.color}dd, ${p.color})`,
                  boxShadow: isLocal
                    ? `0 0 0 2.5px var(--text), 0 4px 16px ${p.color}50`
                    : `0 4px 12px ${p.color}30`,
                }}>
                  {/* Blob eyes */}
                  <div style={S.blobEyes}>
                    <div style={S.blobEye}>
                      <div style={S.blobPupil} />
                    </div>
                    <div style={S.blobEye}>
                      <div style={S.blobPupil} />
                    </div>
                  </div>
                </div>
                <span style={{
                  ...S.playerName,
                  fontWeight: isLocal ? 800 : 600,
                }}>
                  {p.name}
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Progress dots */}
      <div style={S.dots}>
        {STEPS.slice(0, 3).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i <= stepIndex ? 1.3 : 1,
              background: i <= stepIndex ? C.accent : 'var(--border-strong)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={S.dot}
          />
        ))}
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(16px, 3dvh, 32px)',
    padding: 'clamp(16px, 3dvh, 32px)',
    background: 'var(--bg)',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface)',
    border: '1.5px solid var(--border-strong)',
    borderRadius: 999,
    padding: '8px 18px',
    boxShadow: 'var(--shadow-sm)',
  },
  badgeEmoji: {
    fontSize: 'clamp(20px, 3dvh, 28px)',
    lineHeight: 1,
  },
  badgeLabel: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: 'var(--text)',
  },
  centerArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'clamp(100px, 25dvh, 200px)',
  },
  label: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(80px, 22dvh, 180px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    userSelect: 'none',
    zIndex: 2,
    lineHeight: 1,
    color: 'var(--text)',
    textShadow: '0 0 60px var(--border), 0 0 120px var(--border)',
  },
  labelVia: {
    background: 'linear-gradient(135deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: 'none',
  },
  pulseRing: {
    position: 'absolute',
    width: 'clamp(80px, 18dvh, 140px)',
    height: 'clamp(80px, 18dvh, 140px)',
    borderRadius: '50%',
    border: '3px solid var(--border-strong)',
    pointerEvents: 'none',
  },
  playersRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 'clamp(10px, 2.5vw, 18px)',
  },
  playerCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  blobCircle: {
    position: 'relative',
    width: 'clamp(40px, 7vw, 52px)',
    height: 'clamp(40px, 7vw, 52px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blobEyes: {
    display: 'flex',
    gap: 5,
    position: 'relative',
    top: -1,
  },
  blobEye: {
    width: 11,
    height: 13,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
  },
  blobPupil: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#1E1B4B',
    position: 'relative',
    top: 0.5,
  },
  playerName: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    color: 'var(--muted)',
    maxWidth: 56,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  dots: {
    display: 'flex',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
}

export default CountdownOverlay
