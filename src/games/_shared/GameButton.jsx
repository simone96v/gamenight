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

// Secondary/ghost usano le CSS vars del design system → si adattano automaticamente
// a light/dark mode (coerenti con i bottoni dei quiz games).
const SECONDARY = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1.5px solid var(--border-strong)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  hoverGlow: '0 6px 18px rgba(0,0,0,0.10)',
}

const GHOST = {
  background: 'transparent',
  color: 'var(--muted)',
  border: '1px solid var(--border)',
  boxShadow: 'none',
  hoverGlow: '0 4px 14px rgba(0,0,0,0.04)',
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

// Kbd badge: tonalità auto-bilanciate per primary (su gradient scuro) vs
// secondary (su surface chiaro/scuro). Usa currentColor + alpha per ereditare
// il colore del bottone genitore.
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
      color: 'currentColor',
      opacity: 0.92,
      background: 'color-mix(in srgb, currentColor 14%, transparent)',
      border: '1px solid color-mix(in srgb, currentColor 24%, transparent)',
      letterSpacing: '0.04em',
      flexShrink: 0,
    }}
  >
    {children}
  </span>
)

export default GameButton
