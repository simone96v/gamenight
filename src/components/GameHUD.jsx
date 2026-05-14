// HUD bar shown during trivia gameplay.
// Shows: round progress, timer ring, mini player score chips.

import { motion } from 'framer-motion'

const GameHUD = ({
  questionNumber,
  totalQuestions,
  timeLeft,
  total,
  players,
  localPlayerId,
  phase,
  accentColor,
  showTimer: showTimerProp,
  scoreSuffix = '',
}) => {
  const showTimer = showTimerProp ?? (phase === 'question')
  const timerFraction = showTimer ? timeLeft / total : 0
  const urgent = showTimer && timeLeft <= 5
  const accent = accentColor || 'var(--accent)'

  // Sort players by score descending for display
  const sorted = [...(players ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div style={S.container}>
      {/* Progress */}
      <div style={S.progressSection}>
        <span style={S.roundLabel}>
          {questionNumber}/{totalQuestions}
        </span>
        <div style={S.progressBar}>
          <motion.div
            style={{ ...S.progressFill, background: accent }}
            animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Timer ring */}
      {showTimer && (
        <div style={S.timerSection}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--surface2)" strokeWidth="3" />
            <motion.circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke={urgent ? 'var(--danger)' : accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              animate={{
                strokeDashoffset: 2 * Math.PI * 18 * (1 - timerFraction),
              }}
              transition={{ duration: 0.3 }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <motion.span
            style={{
              ...S.timerText,
              color: urgent ? 'var(--danger)' : 'var(--text)',
            }}
            animate={urgent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={urgent ? { repeat: Infinity, duration: 0.8 } : {}}
          >
            {timeLeft}
          </motion.span>
        </div>
      )}

      {/* Player chips */}
      <div style={S.playersSection}>
        {sorted.slice(0, 6).map((p) => (
          <div
            key={p.id}
            style={{
              ...S.playerChip,
              borderColor: p.id === localPlayerId ? accent : 'transparent',
            }}
          >
            <div style={{ ...S.chipAvatar, backgroundColor: p.color }}>
              {p.name?.slice(0, 1).toUpperCase()}
            </div>
            <span style={S.chipScore}>{p.score}{scoreSuffix}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 14px)',
    padding: 'clamp(6px, 1dvh, 10px) clamp(12px, 3vw, 20px)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 48,
  },
  roundLabel: {
    fontSize: 'clamp(10px, 1.3dvh, 12px)',
    color: 'var(--muted)',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  progressBar: {
    height: 3,
    background: 'var(--surface2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 2,
  },
  timerSection: {
    position: 'relative',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerText: {
    position: 'absolute',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  playersSection: {
    display: 'flex',
    gap: 'clamp(4px, 0.8vw, 8px)',
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  playerChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 6px 2px 2px',
    background: 'var(--surface2)',
    borderRadius: 20,
    border: '1.5px solid transparent',
    flexShrink: 0,
  },
  chipAvatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'white',
  },
  chipScore: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--text)',
    minWidth: 16,
    textAlign: 'center',
  },
}

export default GameHUD
