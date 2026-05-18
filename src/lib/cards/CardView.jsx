// CardView — render visuale di una carta italiana (face-up o face-down).
// Stile: carta avorio bordata col colore del seme, etichetta corta in alto-sinistra,
// grande simbolo del seme al centro. Coerente col brand BlobParty (Baloo 2, ombre soft).

import { motion } from 'framer-motion'
import { SUIT_SYMBOLS, SUIT_COLORS, VALUE_LABELS, SHORT_LABELS } from './italianDeck'

const SIZE_PRESETS = {
  xs: { w: 44, h: 64 },
  sm: { w: 60, h: 86 },
  md: { w: 76, h: 108 },
  lg: { w: 96, h: 138 },
  xl: { w: 120, h: 172 },
}

const CardView = ({
  card,
  faceDown = false,
  size = 'md',
  highlight = false,
  onClick,
  disabled = false,
  style,
  rotate = 0,
  layoutId,
}) => {
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.md
  const isInteractive = !!onClick && !disabled

  const base = {
    width: dims.w,
    height: dims.h,
    borderRadius: dims.w * 0.11,
    boxShadow: highlight
      ? `0 0 0 3px var(--text), 0 6px 16px rgba(0,0,0,0.20)`
      : '0 2px 10px rgba(0,0,0,0.15)',
    display: 'flex',
    cursor: isInteractive ? 'pointer' : 'default',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
    transition: 'box-shadow 0.15s ease',
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
    ...style,
  }

  // Carta coperta — back design tipo "blob" giallo su sfondo scuro.
  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        whileHover={isInteractive ? { y: -4 } : undefined}
        whileTap={isInteractive ? { scale: 0.96 } : undefined}
        onClick={isInteractive ? onClick : undefined}
        style={{
          ...base,
          background: 'linear-gradient(135deg, #1F2937 0%, #374151 60%, #1F2937 100%)',
          border: `2px solid #4B5563`,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* pattern blob giallo al centro */}
        <div
          style={{
            width: dims.w * 0.5,
            height: dims.w * 0.5,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FDE68A 0%, #F59E0B 55%, #B45309 100%)',
            boxShadow: '0 0 12px rgba(245,158,11,0.4)',
          }}
        />
      </motion.div>
    )
  }

  if (!card) return null

  const color = SUIT_COLORS[card.suit]
  const symbol = SUIT_SYMBOLS[card.suit]
  const shortLabel = SHORT_LABELS[card.value]
  const fullLabel = VALUE_LABELS[card.value]

  return (
    <motion.div
      layoutId={layoutId}
      whileHover={isInteractive ? { y: -6, scale: 1.04 } : undefined}
      whileTap={isInteractive ? { scale: 0.96 } : undefined}
      onClick={isInteractive ? onClick : undefined}
      style={{
        ...base,
        background: '#FEFCE8',
        border: `2px solid ${color}`,
        flexDirection: 'column',
        padding: dims.w * 0.08,
        position: 'relative',
      }}
      aria-label={`${fullLabel} di ${card.suit}`}
    >
      {/* angolo top-left: valore + suit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span
          style={{
            fontSize: dims.w * 0.24,
            fontWeight: 900,
            color,
            fontFamily: "'Baloo 2', cursive",
            letterSpacing: '-0.04em',
          }}
        >
          {shortLabel}
        </span>
        <span style={{ fontSize: dims.w * 0.18, marginTop: -2 }}>{symbol}</span>
      </div>

      {/* centro: grande simbolo */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: dims.w * 0.55,
        }}
      >
        {symbol}
      </div>
    </motion.div>
  )
}

export default CardView
