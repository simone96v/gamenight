import { motion } from 'framer-motion'
import { haptic } from '../../../utils/haptic'

const ProofCard = ({
  index,
  promptText,
  answerText,
  selected = false,
  disabled = false,
  onClick,
  label,
}) => {
  const parts = promptText ? promptText.split('___') : [promptText]
  const hasBlank = parts.length > 1

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: selected ? -4 : 0,
      }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={!disabled ? {
        y: -3,
        boxShadow: selected
          ? '0 0 0 3px rgba(99, 102, 241, 0.4), 0 12px 32px rgba(99, 102, 241, 0.25)'
          : '0 6px 18px rgba(31, 41, 55, 0.12)',
      } : undefined}
      whileTap={!disabled ? {
        y: 1,
        scale: 0.97,
        boxShadow: selected
          ? '0 0 0 3px rgba(99, 102, 241, 0.3), 0 2px 8px rgba(99, 102, 241, 0.15)'
          : '0 1px 4px rgba(31, 41, 55, 0.06)',
      } : undefined}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 400, damping: 22 }}
      onClick={disabled ? undefined : () => { haptic.light(); onClick?.() }}
      disabled={disabled}
      style={{
        ...S.card,
        border: selected ? '3px solid #6366F1' : '2px solid var(--border)',
        boxShadow: selected
          ? '0 0 0 3px rgba(99, 102, 241, 0.3), 0 8px 24px rgba(99, 102, 241, 0.2)'
          : '0 2px 8px rgba(31, 41, 55, 0.08)',
        cursor: disabled ? 'default' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {label && <span style={S.label}>{label}</span>}
      <p style={S.text}>
        {hasBlank ? (
          <>
            {parts[0]}
            <span style={S.answer}>{answerText}</span>
            {parts[1]}
          </>
        ) : (
          <>
            {promptText} <span style={S.answer}>{answerText}</span>
          </>
        )}
      </p>
    </motion.button>
  )
}

const S = {
  card: {
    width: '100%',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
    padding: 'clamp(12px, 1.8dvh, 18px) clamp(14px, 2.5vw, 20px)',
    textAlign: 'left',
    outline: 'none',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    fontWeight: 800,
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  text: {
    fontSize: 'clamp(13px, 1.7dvh, 16px)',
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--text)',
    margin: 0,
    wordBreak: 'break-word',
  },
  answer: {
    color: '#6366F1',
    fontWeight: 800,
    textDecoration: 'underline',
    textDecorationColor: 'rgba(99, 102, 241, 0.3)',
    textUnderlineOffset: '2px',
    textDecorationThickness: '2px',
  },
}

export default ProofCard
