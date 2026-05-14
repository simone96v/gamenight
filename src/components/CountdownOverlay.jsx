// Full-screen countdown overlay: 3 - 2 - 1 - VIA!
// Driven by questionStartedAt from server. Calls onComplete when done.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '../utils/haptic'

const STEPS = [
  { label: '3', color: 'var(--text)', delay: 0 },
  { label: '2', color: 'var(--muted)', delay: 1 },
  { label: '1', color: 'var(--muted)', delay: 2 },
  { label: 'VIA!', color: '#10B981', delay: 3 },
]

const CountdownOverlay = ({ questionStartedAt, onComplete }) => {
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

  return (
    <div style={S.overlay}>
      <AnimatePresence mode="wait">
        {step && (
          <motion.div
            key={step.label}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ ...S.label, color: step.color }}
          >
            {step.label}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={S.dots}>
        {STEPS.slice(0, 3).map((_, i) => (
          <div
            key={i}
            style={{
              ...S.dot,
              background: i <= stepIndex ? STEPS[Math.min(i, STEPS.length - 1)].color : 'var(--surface2)',
              transform: i <= stepIndex ? 'scale(1.2)' : 'scale(1)',
            }}
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
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  label: {
    fontSize: 'clamp(72px, 20dvh, 160px)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    textShadow: '0 0 40px currentColor',
    userSelect: 'none',
  },
  dots: {
    display: 'flex',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
}

export default CountdownOverlay
