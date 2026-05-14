import { motion } from 'framer-motion'
import { haptic } from '../../../utils/haptic'

const TILE_BG = ['#3730A3', '#6D28D9', '#9333EA', '#C026D3']
const LABELS = ['A', 'B', 'C', 'D']

const AnswerCard = ({
  index,
  text,
  selected = false,
  disabled = false,
  onClick,
}) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{
      opacity: 1,
      scale: 1,
      y: selected ? -4 : 0,
    }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
    whileHover={!disabled ? {
      y: -3,
      scale: 1.02,
      boxShadow: selected
        ? '0 0 0 3px #818CF8, 0 14px 32px rgba(99, 102, 241, 0.4)'
        : '0 8px 22px rgba(31, 41, 55, 0.22)',
    } : undefined}
    whileTap={!disabled ? {
      y: 1,
      scale: 0.96,
      boxShadow: selected
        ? '0 0 0 3px #818CF8, 0 2px 8px rgba(99, 102, 241, 0.2)'
        : '0 2px 6px rgba(31, 41, 55, 0.10)',
    } : undefined}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 400, damping: 22 }}
    onClick={disabled ? undefined : () => { haptic.light(); onClick?.() }}
    disabled={disabled}
    style={{
      ...S.tile,
      background: TILE_BG[index] ?? TILE_BG[0],
      border: selected ? '3px solid #fff' : '3px solid transparent',
      boxShadow: selected
        ? `0 0 0 3px #818CF8, 0 8px 24px rgba(99, 102, 241, 0.35)`
        : '0 4px 12px rgba(31, 41, 55, 0.15)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled && !selected ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}
  >
    <span style={S.label}>{LABELS[index]}</span>
    <span style={S.text}>{text}</span>
  </motion.button>
)

const S = {
  tile: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    borderRadius: 'var(--radius-sm)',
    padding: 'clamp(10px, 1.5dvh, 14px) clamp(12px, 2vw, 16px)',
    gap: 10,
    minHeight: 'clamp(52px, 7dvh, 68px)',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  label: {
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
    background: 'rgba(255,255,255,0.22)',
    color: '#fff',
  },
  text: {
    fontWeight: 600,
    fontSize: 'clamp(13px, 1.7dvh, 16px)',
    lineHeight: 1.35,
    flex: 1,
    textAlign: 'left',
    wordBreak: 'break-word',
    color: '#fff',
  },
}

export default AnswerCard
