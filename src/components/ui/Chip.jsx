import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 400, damping: 22 }

const Chip = ({ children, active = false, onClick, disabled = false, style = {}, ...rest }) => (
  <motion.button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : {
      y: -1,
      boxShadow: active
        ? '0 6px 18px rgba(0,0,0,0.22)'
        : '0 4px 14px rgba(0,0,0,0.08)',
    }}
    whileTap={disabled ? undefined : {
      scale: 0.95,
      y: 0,
      boxShadow: active
        ? '0 2px 6px rgba(0,0,0,0.12)'
        : '0 1px 3px rgba(0,0,0,0.04)',
    }}
    transition={spring}
    style={{
      padding: '8px 16px',
      borderRadius: 22,
      border: active ? '1.5px solid transparent' : '1.5px solid var(--border-strong)',
      background: active ? '#111827' : 'var(--surface)',
      color: active ? '#fff' : 'var(--text)',
      fontSize: 'clamp(13px, 1.5dvh, 15px)',
      fontWeight: 700,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
      opacity: disabled ? 0.5 : 1,
      transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s',
      ...style,
    }}
    {...rest}
  >
    {children}
  </motion.button>
)

export default Chip
