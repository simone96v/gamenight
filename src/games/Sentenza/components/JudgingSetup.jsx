import { motion } from 'framer-motion'
import PromptCard from './PromptCard'

const JudgingSetup = ({ judgeName, judgeColor, round, prompt }) => (
  <div style={S.container}>
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      style={S.emojiWrap}
    >
      <motion.span
        style={{ fontSize: 56 }}
        animate={{ rotate: [0, -18, 18, -10, 0] }}
        transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
      >
        ⚖️
      </motion.span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={S.avatarRow}
    >
      <div style={{ ...S.avatar, backgroundColor: judgeColor }}>
        {initialsOf(judgeName)}
      </div>
      <div>
        <p style={S.title}>
          {judgeName} è il Giudice
        </p>
        <p style={S.round}>Round {round}</p>
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <PromptCard text={prompt} />
    </motion.div>
  </div>
)

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(16px, 2.5dvh, 24px)',
    flex: 1,
  },
  emojiWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 'clamp(48px, 7vw, 60px)',
    height: 'clamp(48px, 7vw, 60px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: 'clamp(18px, 2.4dvh, 22px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: 'clamp(18px, 2.4dvh, 24px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  round: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 600,
    color: 'var(--muted)',
    margin: 0,
  },
}

export default JudgingSetup
