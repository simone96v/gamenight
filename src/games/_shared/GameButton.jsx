// GameButton — bottone footer ottimizzato per i tavoli da gioco (bordeaux).
// Più tattile del Button generico: 56px altezza, icona opzionale a sinistra,
// kbd hint opzionale a destra, hover con glow tintato dal color accent.
//
// Varianti:
//   - primary  → gradiente con accent player, bianco, glow forte
//   - secondary → vetro semitrasparente, testo chiaro
//   - ghost    → solo testo, ancora più leggero (per "skip" o azioni minori)

import { motion } from 'framer-motion'
import { haptic } from '../../utils/haptic'
import { BLOB_GRADIENTS, hexToRgb } from '../../utils/colors'

const SPRING = { type: 'spring', stiffness: 380, damping: 22 }

const buildPrimary = (accent) => {
  const grad = BLOB_GRADIENTS[accent]
  const light = grad?.[0] || accent
  const [r, g, b] = hexToRgb(accent)
  return {
    background: `linear-gradient(135deg, ${accent} 0%, ${light} 100%)`,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: `0 6px 20px rgba(${r},${g},${b},0.35), inset 0 1px 0 rgba(255,255,255,0.25)`,
    hoverGlow: `0 10px 30px rgba(${r},${g},${b},0.55), inset 0 1px 0 rgba(255,255,255,0.3)`,
  }
}

const SECONDARY = {
  background: 'rgba(255,255,255,0.10)',
  color: '#F3F4F6',
  border: '1px solid rgba(255,255,255,0.20)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.10)',
  hoverGlow: '0 6px 18px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
}

const GHOST = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: 'none',
  hoverGlow: '0 4px 14px rgba(0,0,0,0.15)',
}

const GameButton = ({
  variant = 'primary',
  accent = '#F59E0B',
  icon,
  hotkey,
  disabled = false,
  onClick,
  type = 'button',
  width = 'full',
  children,
  style,
  ...rest
}) => {
  const palette = variant === 'primary'
    ? buildPrimary(accent)
    : variant === 'secondary'
      ? SECONDARY
      : GHOST

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : (e) => { haptic.tick(); onClick?.(e) }}
      whileHover={disabled ? undefined : {
        y: -2,
        boxShadow: palette.hoverGlow,
      }}
      whileTap={disabled ? undefined : { y: 1, scale: 0.97 }}
      transition={SPRING}
      style={{
        // layout
        width: width === 'full' ? '100%' : 'auto',
        height: 56,
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: icon ? 'space-between' : 'center',
        gap: 12,
        // tipografia
        fontFamily: "'Baloo 2', cursive",
        fontWeight: 800,
        fontSize: 17,
        letterSpacing: '-0.01em',
        // visual
        borderRadius: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...palette,
        ...style,
      }}
      {...rest}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>}
        <span>{children}</span>
      </span>
      {hotkey && <KbdHint>{hotkey}</KbdHint>}
    </motion.button>
  )
}

const KbdHint = ({ children }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3px 8px',
      borderRadius: 6,
      fontFamily: '"SF Mono", "JetBrains Mono", "Courier New", monospace',
      fontSize: 11,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.92)',
      background: 'rgba(0,0,0,0.30)',
      border: '1px solid rgba(255,255,255,0.18)',
      letterSpacing: '0.04em',
      flexShrink: 0,
    }}
  >
    {children}
  </span>
)

export default GameButton
