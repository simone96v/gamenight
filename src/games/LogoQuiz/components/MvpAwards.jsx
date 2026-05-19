// 3 badge MVP a fine partita di Logo Quiz.
//   🏷️  Brand Hunter   — più correct_count (tie-break: speed_avg)
//   🔥  Streak Master  — best_streak ≥ 3
//   ⚡  Occhio di Falco — speed_avg minimo (min 3 corrette)
// Si aspetta che `players[]` abbia: correct_count, best_streak, total_speed_ms.

import { motion } from 'framer-motion'

function computeMvps(players) {
  if (!players?.length) return []

  const byCorrect = [...players].sort((a, b) => {
    const dc = (b.correct_count ?? 0) - (a.correct_count ?? 0)
    if (dc !== 0) return dc
    const aAvg = (a.correct_count ?? 0) > 0 ? (a.total_speed_ms ?? 0) / a.correct_count : Infinity
    const bAvg = (b.correct_count ?? 0) > 0 ? (b.total_speed_ms ?? 0) / b.correct_count : Infinity
    return aAvg - bAvg
  })
  const hunter = byCorrect[0]
  const hunterOk = (hunter?.correct_count ?? 0) >= 1

  const byStreak = [...players].sort((a, b) => (b.best_streak ?? 0) - (a.best_streak ?? 0))
  const streaker = byStreak[0]
  const streakerOk = (streaker?.best_streak ?? 0) >= 3

  const eligibleFast = players
    .filter((p) => (p.correct_count ?? 0) >= 3)
    .sort((a, b) => {
      const aAvg = (a.total_speed_ms ?? 0) / (a.correct_count || 1)
      const bAvg = (b.total_speed_ms ?? 0) / (b.correct_count || 1)
      return aAvg - bAvg
    })
  const eye = eligibleFast[0]
  const eyeOk = !!eye

  return [
    {
      key: 'hunter',
      emoji: '🏷️',
      title: 'Brand Hunter',
      player: hunterOk ? hunter : null,
      stat: hunterOk ? `${hunter.correct_count} indovinati` : '—',
      color: 'var(--accent)',
    },
    {
      key: 'streak',
      emoji: '🔥',
      title: 'Streak Master',
      player: streakerOk ? streaker : null,
      stat: streakerOk ? `streak ×${streaker.best_streak}` : '—',
      color: 'var(--warning)',
    },
    {
      key: 'eye',
      emoji: '⚡',
      title: 'Occhio di Falco',
      player: eyeOk ? eye : null,
      stat: eyeOk
        ? `${((eye.total_speed_ms / eye.correct_count) / 1000).toFixed(1)}s/logo`
        : '—',
      color: 'var(--accent3)',
    },
  ]
}

const MvpAwards = ({ players }) => {
  const mvps = computeMvps(players)
  return (
    <div style={wrapStyle}>
      {mvps.map((m, i) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.08 }}
          style={{
            ...cardBase,
            border: `1.5px solid ${m.player ? m.color : 'var(--border)'}`,
            opacity: m.player ? 1 : 0.55,
          }}
        >
          <span style={emojiStyle}>{m.emoji}</span>
          <span style={{ ...titleStyle, color: m.player ? m.color : 'var(--muted)' }}>
            {m.title}
          </span>
          <span style={nameStyle}>{m.player?.name ?? 'Nessuno'}</span>
          <span style={statStyle}>{m.stat}</span>
        </motion.div>
      ))}
    </div>
  )
}

const wrapStyle = { display: 'flex', gap: 'clamp(6px, 1.2vw, 10px)', flexShrink: 0 }
const cardBase = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: 'clamp(8px, 1.4dvh, 12px) clamp(6px, 1vw, 10px)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  minWidth: 0,
}
const emojiStyle = { fontSize: 'clamp(20px, 2.6dvh, 26px)', lineHeight: 1 }
const titleStyle = {
  fontSize: 'clamp(9px, 1.1dvh, 11px)',
  fontWeight: 800,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  textAlign: 'center',
}
const nameStyle = {
  fontSize: 'clamp(11px, 1.4dvh, 13px)',
  fontWeight: 700,
  color: 'var(--text)',
  textAlign: 'center',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const statStyle = {
  fontSize: 'clamp(10px, 1.2dvh, 12px)',
  color: 'var(--muted)',
  fontWeight: 600,
}

export default MvpAwards
