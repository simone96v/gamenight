// Full-screen countdown overlay: 3 - 2 - 1 - VIA!
// Driven by questionStartedAt from server. Calls onComplete when done.
// Supports optional players, category, and accent color for rich display.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '../utils/haptic'

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
  accentColor = '#7C3AED',
}) => {
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
        if (idx === 3) haptic.heavy()
        else haptic.tick()
      }

      setStepIndex(idx)
      requestAnimationFrame(tick)
    }

    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [questionStartedAt, onComplete])

  const step = STEPS[stepIndex]
  const isVia = stepIndex === 3

  // Step color: accent for numbers, green for VIA!
  const stepColor = isVia ? '#10B981' : accentColor

  return (
    <div style={{ ...S.overlay, background: `linear-gradient(170deg, var(--bg) 0%, ${accentColor}12 100%)` }}>
      {/* Category badge at the top */}
      {category && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ ...S.categoryBadge, borderColor: `${accentColor}30` }}
        >
          <span style={S.categoryEmoji}>{category.emoji}</span>
          <span style={{ ...S.categoryLabel, color: accentColor }}>{category.label}</span>
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
                color: stepColor,
                textShadow: `0 0 60px ${stepColor}40, 0 0 120px ${stepColor}20`,
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
              style={{
                ...S.pulseRing,
                borderColor: stepColor,
              }}
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
                    ? `0 0 0 2.5px ${accentColor}, 0 4px 16px ${p.color}50`
                    : `0 4px 12px ${p.color}30`,
                }}>
                  <span style={S.blobInitials}>
                    {initialsOf(p.name)}
                  </span>
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
                  color: isLocal ? accentColor : 'var(--muted)',
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
              background: i <= stepIndex ? stepColor : 'var(--surface2)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={S.dot}
          />
        ))}
      </div>
    </div>
  )
}

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
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
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface)',
    border: '1.5px solid',
    borderRadius: 999,
    padding: '8px 18px',
    boxShadow: 'var(--shadow-sm)',
  },
  categoryEmoji: {
    fontSize: 'clamp(20px, 3dvh, 28px)',
    lineHeight: 1,
  },
  categoryLabel: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    letterSpacing: '0.02em',
  },
  centerArea: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'clamp(100px, 25dvh, 200px)',
  },
  label: {
    fontSize: 'clamp(80px, 22dvh, 180px)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    userSelect: 'none',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 'clamp(80px, 18dvh, 140px)',
    height: 'clamp(80px, 18dvh, 140px)',
    borderRadius: '50%',
    border: '3px solid',
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
  blobInitials: {
    display: 'none', // Hidden — eyes shown instead
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
