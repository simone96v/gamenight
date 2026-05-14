import { motion } from 'framer-motion'

const GameSection = ({
  children,
  title,
  emoji,
  delay = 0,
  noPad = false,
  style,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      padding: noPad ? 0 : 'clamp(12px, 1.8dvh, 18px) clamp(14px, 3vw, 20px)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {title && (
      <div style={headerStyle}>
        {emoji && <span style={{ fontSize: 'clamp(16px, 2dvh, 20px)' }}>{emoji}</span>}
        <span style={titleStyle}>{title}</span>
      </div>
    )}
    {children}
  </motion.div>
)

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 'clamp(8px, 1.2dvh, 12px)',
}

const titleStyle = {
  fontSize: 'clamp(13px, 1.7dvh, 16px)',
  fontWeight: 800,
  color: 'var(--text)',
  letterSpacing: '-0.01em',
}

export default GameSection
