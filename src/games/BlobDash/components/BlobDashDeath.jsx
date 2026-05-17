import { motion } from 'framer-motion'

const SPRING = { type: 'spring', stiffness: 400, damping: 22 }

const BlobDashDeath = ({ score, blobColor, onRestart }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,10,30,0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 20,
        gap: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          color: blobColor,
          textShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: 80, fontWeight: 900, letterSpacing: '-0.02em' }}>{score}</span>
        <span style={{ fontSize: 32, fontWeight: 800, opacity: 0.75 }}>m</span>
      </motion.div>

      <div style={{ color: '#fff', fontSize: 16, opacity: 0.65, letterSpacing: '0.05em' }}>
        BOOM
      </div>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ y: 1, scale: 0.97 }}
        transition={SPRING}
        onClick={onRestart}
        style={{
          marginTop: 8,
          padding: '14px 32px',
          background: blobColor,
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: `0 8px 24px ${blobColor}66`,
        }}
      >
        Riprova
      </motion.button>
    </motion.div>
  )
}

export default BlobDashDeath
