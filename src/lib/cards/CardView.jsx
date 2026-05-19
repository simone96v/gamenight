// CardView — render visuale di una carta italiana (face-up o face-down).
// Usa uno sprite sheet `/cards/italian-deck.png` (4 righe × 10 colonne) per
// disegnare le 40 carte Bergamasche. CSS background-position seleziona la cella.
//
// Mappatura nello sprite:
//   - righe: bastoni(0), spade(1), coppe(2), denari(3)
//   - colonne: valore 1-10 → col 0-9 (asso, 2..7, fante, cavallo, re)
//
// Aspect ratio source: 0.6 (240×400 per cella su 2400×1600).
// SIZE_PRESETS allineati a 0.6 per evitare distorsioni dello sprite.

import { motion } from 'framer-motion'

const SPRITE_URL = '/cards/italian-deck.png'
const BACK_URL = '/cards/card-back.png'
const COLS = 10
const ROWS = 4
const SUIT_ROW = { bastoni: 0, spade: 1, coppe: 2, denari: 3 }

const SIZE_PRESETS = {
  xs: { w: 42, h: 70 },
  sm: { w: 54, h: 90 },
  md: { w: 68, h: 114 },
  lg: { w: 86, h: 144 },
  xl: { w: 108, h: 180 },
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
      ? '0 0 0 3px var(--text), 0 6px 16px rgba(0,0,0,0.20)'
      : '0 2px 10px rgba(0,0,0,0.15)',
    cursor: isInteractive ? 'pointer' : 'default',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
    transition: 'box-shadow 0.15s ease',
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
    ...style,
  }

  // Carta coperta: card-back.png con blob giallo centrale e cornice argentata.
  if (faceDown) {
    return (
      <motion.div
        layoutId={layoutId}
        whileHover={isInteractive ? { y: -4 } : undefined}
        whileTap={isInteractive ? { scale: 0.96 } : undefined}
        onClick={isInteractive ? onClick : undefined}
        style={{
          ...base,
          backgroundImage: `url(${BACK_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    )
  }

  if (!card) return null

  const row = SUIT_ROW[card.suit] ?? 0
  const col = Math.max(0, Math.min(COLS - 1, (card.value || 1) - 1))

  // Sprite positioning pixel-perfect + bleed crop:
  // - le percentuali soffrivano di subpixel rounding → bordo nero del cell
  //   confinante visibile come "riga nera" sul bordo della carta.
  // - usiamo size in pixel (esatto) + overshoot di BLEED px su tutti i lati,
  //   poi croppiamo via overflow: hidden. Questo rimuove anche il bordo nero
  //   della carta nello sprite (~4 source-px), che era doppiato dal nostro
  //   border CSS.
  const BLEED = 1.5
  const cellW = dims.w + BLEED * 2
  const cellH = dims.h + BLEED * 2

  return (
    <motion.div
      layoutId={layoutId}
      whileHover={isInteractive ? { y: -6, scale: 1.04 } : undefined}
      whileTap={isInteractive ? { scale: 0.96 } : undefined}
      onClick={isInteractive ? onClick : undefined}
      style={{
        ...base,
        background: '#FEFCE8',
        overflow: 'hidden',
        backgroundImage: `url(${SPRITE_URL})`,
        backgroundSize: `${cellW * COLS}px ${cellH * ROWS}px`,
        backgroundPosition: `${-col * cellW - BLEED}px ${-row * cellH - BLEED}px`,
        backgroundRepeat: 'no-repeat',
      }}
      aria-label={`${card.value} di ${card.suit}`}
    />
  )
}

export default CardView
