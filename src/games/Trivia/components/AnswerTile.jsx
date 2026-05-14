// Tile risposta. Due modalità:
//   mode='answer'  → cliccabile durante phase question
//   mode='reveal'  → mostra esito (correct verde / wrong rosso) + voters opzionali
//
// Voters: array di player che hanno scelto questa risposta (mostrati come avatar mini)
// Used in: QuestionPhase, RevealPhase

import { motion } from 'framer-motion'
import { ANSWER_COLORS, ANSWER_LABELS } from '../constants'
import { haptic } from '../../../utils/haptic'

const AnswerTile = ({
  index,
  text,
  mode = 'answer',
  isMine = false,
  isCorrect = false,
  isLocked = false,
  disabled = false,
  onClick,
  voters = [],
}) => {
  // --- ANSWER MODE ---
  if (mode === 'answer') {
    const bg = ANSWER_COLORS[index]
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        whileHover={!disabled ? {
          y: -3,
          scale: 1.02,
          boxShadow: isMine
            ? '0 12px 30px rgba(31, 41, 55, 0.3)'
            : '0 8px 22px rgba(31, 41, 55, 0.18)',
        } : undefined}
        whileTap={!disabled ? {
          y: 1,
          scale: 0.96,
          boxShadow: '0 2px 6px rgba(31, 41, 55, 0.10)',
        } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        onClick={disabled ? undefined : () => { haptic.light(); onClick?.() }}
        disabled={disabled}
        style={{
          ...tileBase,
          background: bg,
          color: '#fff',
          cursor: disabled ? 'default' : 'pointer',
          opacity: isLocked ? (isMine ? 1 : 0.45) : 1,
          border: isMine ? '3px solid var(--text)' : '3px solid transparent',
          boxShadow: isMine
            ? '0 8px 22px rgba(31, 41, 55, 0.22)'
            : '0 2px 8px rgba(31, 41, 55, 0.10)',
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        <Label index={index} bgKind="onColor" />
        <span style={textStyle}>{text}</span>
      </motion.button>
    )
  }

  // --- REVEAL MODE ---
  const bgReveal = isCorrect ? 'var(--success)' : isMine ? 'var(--danger)' : 'var(--bg2)'
  const textColor = isCorrect || isMine ? '#fff' : 'var(--muted)'
  const opacity = isCorrect || isMine ? 1 : 0.5

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity, scale: isCorrect && isMine ? 1.02 : 1 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      style={{
        ...tileBase,
        background: bgReveal,
        color: textColor,
        border: isMine
          ? `3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}`
          : '3px solid transparent',
        boxShadow: '0 2px 6px rgba(31, 41, 55, 0.10)',
        position: 'relative',
      }}
    >
      <Label
        index={index}
        bgKind={isCorrect || isMine ? 'onColor' : 'onMuted'}
        color={textColor}
      />
      <span style={textStyle}>{text}</span>

      {/* Voters dots */}
      {voters.length > 0 && (
        <div style={{
          position: 'absolute',
          right: 6,
          top: -8,
          display: 'flex',
          gap: 2,
        }}>
          {voters.slice(0, 5).map((p) => (
            <div
              key={p.id}
              title={p.name}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: p.color,
                border: '2px solid var(--surface)',
                marginLeft: -4,
              }}
            />
          ))}
          {voters.length > 5 && (
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--text)',
              alignSelf: 'center',
              marginLeft: 2,
            }}>
              +{voters.length - 5}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

const Label = ({ index, bgKind, color }) => (
  <span style={{
    width: 'clamp(26px, 3.2vw, 32px)',
    height: 'clamp(26px, 3.2vw, 32px)',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 'clamp(11px, 1.4dvh, 14px)',
    fontWeight: 800,
    letterSpacing: '0.04em',
    background: bgKind === 'onColor' ? 'rgba(255,255,255,0.25)' : 'rgba(31,41,55,0.08)',
    color: color ?? 'inherit',
  }}>
    {ANSWER_LABELS[index]}
  </span>
)

const tileBase = {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'left',
  borderRadius: 'var(--radius-sm)',
  padding: 'clamp(10px, 1.5dvh, 14px) clamp(12px, 2vw, 16px)',
  gap: 10,
  height: 'clamp(56px, 8dvh, 72px)',
  border: '3px solid transparent',
  outline: 'none',
  boxSizing: 'border-box',
}

const textStyle = {
  fontWeight: 600,
  fontSize: 'clamp(12px, 1.55dvh, 15px)',
  lineHeight: 1.3,
  flex: 1,
  textAlign: 'left',
  wordBreak: 'break-word',
}

export default AnswerTile
