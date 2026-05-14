import { motion } from 'framer-motion'

const ACCENT = '#6366F1'

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const JudgeBanner = ({ judgeName, judgeColor, label = 'Giudice' }) => (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    style={S.bar}
  >
    <span style={S.gavel}>⚖️</span>
    <span style={S.label}>{label}:</span>
    <div style={{ ...S.avatar, backgroundColor: judgeColor || ACCENT }}>
      {initialsOf(judgeName)}
    </div>
    <span style={S.name}>{judgeName || '—'}</span>
  </motion.div>
)

const S = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 'clamp(6px, 1dvh, 10px) clamp(10px, 2vw, 14px)',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.10), rgba(129, 140, 248, 0.06))',
    borderRadius: 999,
    border: `1px solid ${ACCENT}33`,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  gavel: {
    fontSize: 'clamp(14px, 1.8dvh, 18px)',
  },
  label: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: 10,
    flexShrink: 0,
  },
  name: {
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 800,
    color: 'var(--text)',
  },
}

export default JudgeBanner
