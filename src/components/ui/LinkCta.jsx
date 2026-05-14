// Pulsante secondario "link-like" con un piccolo background.
// Usato come CTA secondaria nei footer (es. "Ho un codice", "← Indietro").

import { motion } from 'framer-motion'

const LinkCta = ({ children, onClick, style = {}, ...rest }) => (
  <motion.button
    type="button"
    whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(0,0,0,0.10)' }}
    whileTap={{ y: 0, scale: 0.97, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    onClick={onClick}
    style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border-strong)',
      color: 'var(--text)',
      fontWeight: 700,
      fontSize: 'clamp(13px, 1.7dvh, 15px)',
      padding: 'clamp(10px, 1.5dvh, 14px) clamp(18px, 4vw, 26px)',
      borderRadius: 999,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      letterSpacing: '-0.005em',
      ...style,
    }}
    {...rest}
  >
    {children}
  </motion.button>
)

export default LinkCta
