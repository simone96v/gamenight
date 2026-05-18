// CardView — render visuale di una carta italiana (face-up o face-down).
// Usa uno sprite sheet `/cards/italian-deck.png` (4 righe × 10 colonne) per
// disegnare le 40 carte Piacentine. CSS background-position seleziona la cella.
//
// Mappatura nello sprite:
//   - righe: coppe(0), denari(1), bastoni(2), spade(3)
//   - colonne: valore 1-10 → col 0-9 (asso, 2..7, fante, cavallo, re)
//
// Aspect ratio source: ~0.72 (275×384 per cella su 2752×1536).
// SIZE_PRESETS allineati a 0.72 per evitare distorsioni dello sprite.

import { motion } from 'framer-motion'

const SPRITE_URL = '/cards/italian-deck.png'
const BACK_URL = '/cards/card-back.png'
const COLS = 10
const ROWS = 4
const SUIT_ROW = { coppe: 0, denari: 1, bastoni: 2, spade: 3 }

const SIZE_PRESETS = {
  xs: { w: 46, h: 64 },
  sm: { w: 62, h: 86 },
  md: { w: 78, h: 108 },
  lg: { w: 100, h: 138 },
  xl: { w: 124, h: 172 },
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
  // CSS sprite percentage formula: con background-size {COLS*100}% {ROWS*100}%,
  // la position si calcola come col/(COLS-1)*100% e row/(ROWS-1)*100%.
  const bgPosX = `${(col / (COLS - 1)) * 100}%`
  const bgPosY = `${(row / (ROWS - 1)) * 100}%`

  return (
    <motion.div
      layoutId={layoutId}
      whileHover={isInteractive ? { y: -6, scale: 1.04 } : undefined}
      whileTap={isInteractive ? { scale: 0.96 } : undefined}
      onClick={isInteractive ? onClick : undefined}
      style={{
        ...base,
        background: '#FEFCE8',
        border: '1.5px solid #1F2937',
        backgroundImage: `url(${SPRITE_URL})`,
        backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${bgPosX} ${bgPosY}`,
        backgroundRepeat: 'no-repeat',
      }}
      aria-label={`${card.value} di ${card.suit}`}
    />
  )
}

export default CardView
