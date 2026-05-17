import { motion } from 'framer-motion'
import { BLOB_GRADIENTS, hexToRgb } from '../../../utils/colors'

const DEATH_REASON = {
  wrong_color: 'Hai preso il colore sbagliato!',
  bomb: 'BOOM! Era una bomba.',
  missed_right: 'Ti è scappato un blob!',
}

const SadBlob = ({ color = '#8B5CF6', size = 72 }) => {
  const grad = BLOB_GRADIENTS[color] || [color, color, color]
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="catchblob-death-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={grad[0]} />
          <stop offset="55%" stopColor={grad[1]} />
          <stop offset="100%" stopColor={grad[2]} />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill="url(#catchblob-death-grad)" stroke={grad[2]} strokeWidth="1.5" />
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
      <path
        d={`M${r - r * 0.2} ${r * 1.25} Q${r} ${r * 1.1}, ${r + r * 0.2} ${r * 1.25}`}
        fill="none" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

const CatchBlobDeath = ({ score, blobColor, deathReason, onAction, actionLabel, waitingMessage }) => {
  const accent = blobColor || '#8B5CF6'
  const grad = BLOB_GRADIENTS[accent] || [accent, accent, accent]
  const light = grad[0]
  const [r, g, b] = hexToRgb(accent)
  const reasonText = DEATH_REASON[deathReason] ?? 'Hai perso!'

  return (
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
        <div style={styles.title}>Game Over</div>
        <div style={styles.reason}>{reasonText}</div>
        <div style={styles.scoreRow}>
          <motion.span
            style={{ ...styles.scoreValue, color: accent }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.35 }}
          >
            {score}
          </motion.span>
          <span style={{ ...styles.scoreUnit, color: light }}>pt</span>
        </div>
        <div style={styles.sub}>
          {waitingMessage || 'Punteggio finale'}
        </div>
        {onAction && !waitingMessage && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ y: -2 }}
            whileTap={{ y: 1, scale: 0.97 }}
            onClick={onAction}
            style={{
              ...styles.btn,
              background: `linear-gradient(135deg, ${accent}, ${light})`,
              boxShadow: `0 6px 18px rgba(${r},${g},${b},0.35)`,
            }}
          >
            {actionLabel || 'Classifica'}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}

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
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 600,
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
    letterSpacing: '-0.03em',
  },
  scoreUnit: {
    fontSize: 18,
    fontWeight: 700,
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 600,
    marginTop: 2,
    marginBottom: 18,
  },
  btn: {
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
}

export default CatchBlobDeath
