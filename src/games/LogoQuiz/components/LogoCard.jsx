// LogoCard — box bianco col logo del round, con reveal progressivo via CSS blur.
//
//   tier             'easy' | 'medium' | 'hard'  → grayscale / silhouette
//   revealProgress   0..1                         → 0 = totalmente sfocato, 1 = nitido
//   reveal           bool                          → fase reveal: forza full-color + no blur
//
// Curva blur: lineare con startBlur dipendente dal tier (hard ha più blur iniziale).
// Il timer chiamante aggiorna revealProgress a ogni RAF (via useServerTimer), così
// la sfocatura si dissolve in modo fluido senza transition CSS (cambiare blur con
// transition sarebbe più lento del tick del server e introdurrebbe lag percepito).

import { motion } from 'framer-motion'

const START_BLUR_PX = {
  easy: 16,
  medium: 22,
  hard: 24,
}

const LogoCard = ({ logo, tier = 'easy', revealProgress = 1, reveal = false }) => {
  if (!logo?.file) return null
  const effectiveTier = reveal ? 'easy' : tier
  const src = effectiveTier === 'hard' && logo.monochromeFile ? logo.monochromeFile : logo.file

  // Filtri tier (colore/grayscale/silhouette).
  const tierFilter = effectiveTier === 'medium' ? 'grayscale(100%)'
    : effectiveTier === 'hard' && !logo.monochromeFile ? 'grayscale(1) contrast(2)'
    : ''

  // Blur progressivo: in fase reveal sempre 0, altrimenti scala con revealProgress.
  const clamped = Math.max(0, Math.min(1, revealProgress))
  const startBlur = START_BLUR_PX[effectiveTier] ?? START_BLUR_PX.easy
  const blurPx = reveal ? 0 : Math.max(0, startBlur * (1 - clamped))

  const filter = [tierFilter, blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : '']
    .filter(Boolean)
    .join(' ') || 'none'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={cardStyle}
    >
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        style={{ ...imgStyle, filter }}
        draggable={false}
      />
    </motion.div>
  )
}

const cardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '1 / 1',
  maxWidth: 'clamp(220px, 42dvh, 320px)',
  margin: '0 auto',
  background: '#ffffff',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 6px 22px rgba(31, 41, 55, 0.12), 0 1px 3px rgba(31, 41, 55, 0.06)',
  padding: 'clamp(16px, 3dvh, 28px)',
  // overflow:hidden così il blur non sbava fuori dal card
  overflow: 'hidden',
  flexShrink: 0,
}

const imgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
  // willChange aiuta a tenere il filter blur su layer GPU.
  willChange: 'filter',
}

export default LogoCard
