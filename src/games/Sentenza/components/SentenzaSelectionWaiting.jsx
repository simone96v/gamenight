import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import PromptCard from './PromptCard'

const ACCENT = '#6366F1'

const SentenzaSelectionWaiting = ({
  prompt,
  players: hudPlayers,
  challengers = [],
  submittedIds = [],
  timeLeft,
  total,
  currentRound,
  totalRounds,
  localPlayerId,
  isHost,
  onExit,
}) => {
  const submittedSet = new Set(submittedIds)

  return (
    <div style={S.container}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={currentRound} total={totalRounds} />}
      />
      <GameHUD
        questionNumber={currentRound}
        totalQuestions={totalRounds}
        timeLeft={timeLeft}
        total={total}
        players={hudPlayers}
        localPlayerId={localPlayerId}
        phase="question"
        accentColor={ACCENT}
        scoreSuffix="⚖️"
      />

      <div style={S.body}>
        <PromptCard text={prompt} compact />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={S.judgeBox}
        >
          <motion.span
            style={{ fontSize: 'clamp(36px, 5dvh, 48px)' }}
            animate={{ rotate: [0, -12, 12, -12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⚖️
          </motion.span>
          <p style={S.title}>Sei il Giudice</p>
          <p style={S.sub}>Le prove stanno arrivando...</p>

          <div style={S.avatarRow}>
            {challengers.map((p) => {
              const done = submittedSet.has(p.id)
              return (
                <motion.div
                  key={p.id}
                  animate={done ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                  transition={done ? {} : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={S.avatarWrap}
                >
                  <div
                    style={{
                      ...S.avatar,
                      backgroundColor: p.color,
                      opacity: done ? 1 : 0.4,
                      boxShadow: done ? '0 0 0 3px var(--success)' : 'none',
                    }}
                  >
                    {initialsOf(p.name)}
                  </div>
                  {done && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={S.checkBadge}
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>

          <p style={S.counter}>
            {submittedIds.length}/{challengers.length} prove presentate
          </p>
        </motion.div>
      </div>
    </div>
  )
}

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const RoundBadge = ({ n, total }) => (
  <div style={{
    background: 'var(--bg2)',
    color: ACCENT,
    fontWeight: 800,
    fontSize: 'clamp(11px, 1.4dvh, 13px)',
    padding: '5px 12px',
    borderRadius: 999,
    border: `1.5px solid ${ACCENT}33`,
    letterSpacing: '0.05em',
    minWidth: 44,
    textAlign: 'center',
  }}>
    {n}/{total}
  </div>
)

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
    gap: 'clamp(10px, 1.5dvh, 16px)',
    overflow: 'auto',
  },
  judgeBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: 'clamp(20px, 3dvh, 32px)',
  },
  title: {
    fontSize: 'clamp(20px, 2.6dvh, 26px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  sub: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 600,
    color: 'var(--muted)',
    margin: 0,
  },
  avatarRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 'clamp(40px, 6vw, 52px)',
    height: 'clamp(40px, 6vw, 52px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 'clamp(14px, 2dvh, 18px)',
    transition: 'opacity 0.3s, box-shadow 0.3s',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--success)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 700,
    color: 'var(--muted)',
    margin: 0,
    marginTop: 4,
  },
}

export default SentenzaSelectionWaiting
