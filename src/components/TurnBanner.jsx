// Banner "Tocca a Marco" — animazione di entrata Framer Motion (scale + fade).
// Background tinto con player.color a bassa opacità, bordo color player.color, testo --text grande.

import { motion } from 'framer-motion'

const TurnBanner = ({ player, message = 'Tocca a' }) => {
  if (!player) return null
  const tint = `color-mix(in srgb, ${player.color} 22%, var(--surface))`
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="rounded flex items-center justify-center text-center font-bold w-full"
      style={{
        background: tint,
        border: `1.5px solid ${player.color}`,
        color: 'var(--text)',
        padding: 'clamp(14px, 2.5dvh, 22px) clamp(16px, 4vw, 28px)',
        fontSize: 'clamp(18px, 3dvh, 28px)',
        letterSpacing: '-0.01em',
      }}
    >
      {message}{' '}
      <span style={{ color: player.color, marginLeft: 6 }}>{player.name}</span>
    </motion.div>
  )
}

export default TurnBanner
