// MenuButton — pulsante hamburger (icona 3 linee → X).
// Apre/chiude il drawer globale gestito da GlobalMenu via useNavMenu store.
// Va montato all'interno di un header (AppHeader o barra custom).

import { motion } from 'framer-motion'
import { useNavMenu } from '../stores/useNavMenu'

const SPRING = { type: 'spring', stiffness: 320, damping: 26 }

const SIZES = {
  sm: 'clamp(32px, 4.5dvh, 36px)',
  md: 'clamp(36px, 5.5dvh, 42px)',
}

const MenuButton = ({ size = 'md', style = {} }) => {
  const open = useNavMenu((s) => s.open)
  const toggle = useNavMenu((s) => s.toggle)
  const dim = SIZES[size] ?? SIZES.md

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label={open ? 'Chiudi menu' : 'Apri menu'}
      aria-expanded={open}
      whileHover={{ scale: 1.08, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.92, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        width: dim,
        height: dim,
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: 0,
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <HamburgerIcon open={open} />
    </motion.button>
  )
}

const HamburgerIcon = ({ open }) => {
  const common = {
    fill: 'none',
    stroke: 'var(--text)',
    strokeWidth: 2.2,
    strokeLinecap: 'round',
  }
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
      <motion.line
        x1="3" x2="19" y1="6" y2="6"
        animate={open ? { x1: 4, x2: 18, y1: 4, y2: 18 } : { x1: 3, x2: 19, y1: 6, y2: 6 }}
        transition={SPRING}
        {...common}
      />
      <motion.line
        x1="3" x2="19" y1="11" y2="11"
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.12 }}
        {...common}
      />
      <motion.line
        x1="3" x2="19" y1="16" y2="16"
        animate={open ? { x1: 4, x2: 18, y1: 18, y2: 4 } : { x1: 3, x2: 19, y1: 16, y2: 16 }}
        transition={SPRING}
        {...common}
      />
    </svg>
  )
}

export default MenuButton
