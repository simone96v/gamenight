// TapShockwaves — renderizza le onde d'urto sopra un blob tappabile.
// Va inserito DENTRO il wrapper position-relative del blob (così le onde
// si centrano sulle dimensioni del blob via inset:0). Il blob deve avere
// zIndex >= 2 per stare SOPRA le onde (zIndex 1).

import { motion, AnimatePresence } from 'framer-motion'

const TapShockwaves = ({ waves, removeWave, color, strokeWidth = 3 }) => (
  <AnimatePresence>
    {waves.map((wv) => (
      <motion.span
        key={wv.id}
        initial={{ scale: 0.25, opacity: 0.7 }}
        animate={{ scale: 1.25, opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        onAnimationComplete={() => removeWave(wv.id)}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${strokeWidth}px solid ${color}`,
          boxShadow: `0 0 18px ${color}66`,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          zIndex: 1,
        }}
      />
    ))}
  </AnimatePresence>
)

export default TapShockwaves
