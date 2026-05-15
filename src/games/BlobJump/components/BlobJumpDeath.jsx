import { motion } from 'framer-motion'
import { BLOB_GRADIENTS } from '../../../utils/colors'

const SadBlob = ({ color = '#8B5CF6', size = 72 }) => {
  const grad = BLOB_GRADIENTS[color] || [color, color, color]
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="death-blob-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={grad[0]} />
          <stop offset="55%" stopColor={grad[1]} />
          <stop offset="100%" stopColor={grad[2]} />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill="url(#death-blob-grad)" stroke={grad[2]} strokeWidth="1.5" />
      {/* X eyes */}
      {[-1, 1].map((side) => {
        const ex = r + side * r * 0.3
        const ey = r * 0.82
        const s = r * 0.16
        return (
          <g key={side}>
            <line x1={ex - s} y1={ey - s} x2={ex + s} y2={ey + s} stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" />
            <line x1={ex + s} y1={ey - s} x2={ex - s} y2={ey + s} stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" />
          </g>
        )
      })}
      {/* Sad mouth */}
      <path
        d={`M${r - r * 0.2} ${r * 1.25} Q${r} ${r * 1.1}, ${r + r * 0.2} ${r * 1.25}`}
        fill="none" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

const BlobJumpDeath = ({ score, blobColor, onRestart, waitingMessage }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
    style={styles.overlay}
  >
    <motion.div
      initial={{ scale: 0.8, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
      style={styles.card}
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ marginBottom: 6 }}
      >
        <SadBlob color={blobColor} size={72} />
      </motion.div>
      <div style={styles.title}>Sei caduto!</div>
      <div style={styles.scoreRow}>
        <motion.span
          style={styles.scoreValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.35 }}
        >
          {score}
        </motion.span>
        <span style={styles.scoreUnit}>m</span>
      </div>
      <div style={styles.sub}>
        {waitingMessage || 'Altezza massima raggiunta'}
      </div>
      {onRestart && !waitingMessage && (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ y: 1, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          onClick={onRestart}
          style={styles.btn}
        >
          Riprova
        </motion.button>
      )}
    </motion.div>
  </motion.div>
)

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    padding: 24,
  },
  card: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: '28px 24px',
    textAlign: 'center',
    maxWidth: 260,
    width: '100%',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text)',
    marginBottom: 10,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 3,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: 900,
    color: '#8B5CF6',
    letterSpacing: '-0.03em',
  },
  scoreUnit: {
    fontSize: 18,
    fontWeight: 700,
    color: '#A78BFA',
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 600,
    marginTop: 2,
    marginBottom: 18,
  },
  btn: {
    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(139,92,246,0.35)',
    width: '100%',
  },
}

export default BlobJumpDeath
