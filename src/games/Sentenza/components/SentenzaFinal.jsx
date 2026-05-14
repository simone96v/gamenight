import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import PlayerAvatar from '../../../components/PlayerAvatar'

const ACCENT = '#6366F1'
const PODIUM_EMOJIS = ['🥇', '🥈', '🥉']

const SentenzaFinal = ({
  players,
  localPlayerId,
  isHost,
  advancing,
  onReplay,
  onChangeGame,
}) => {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div style={S.container}>
      <AppHeader />

      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle
            as="h2"
            size="lg"
            gradient="linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #4F46E5 100%)"
          >
            ⚖️ Giudice Supremo
          </GradientTitle>
        </motion.div>

        {sorted.length >= 2 && (
          <div style={S.podium}>
            {[1, 0, 2].map((rank) => {
              const p = sorted[rank]
              if (!p) return <div key={rank} style={{ flex: 1 }} />
              const isFirst = rank === 0
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rank === 0 ? 0.3 : rank === 1 ? 0.1 : 0.5 }}
                  style={{
                    ...S.podiumSlot,
                    transform: isFirst ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: isFirst ? 32 : 24 }}>{PODIUM_EMOJIS[rank]}</span>
                  <PlayerAvatar player={p} showScore={false} size={isFirst ? 'lg' : 'md'} />
                  <span style={S.podiumName}>{p.name}</span>
                  <span style={S.podiumScore}>{p.score ?? 0}</span>
                </motion.div>
              )
            })}
          </div>
        )}

        <div style={S.leaderboard}>
          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              style={{
                ...S.row,
                border: p.id === localPlayerId ? `1.5px solid ${ACCENT}` : '1.5px solid transparent',
                background: p.id === localPlayerId ? `${ACCENT}1a` : 'var(--surface)',
              }}
            >
              <span style={S.rank}>#{i + 1}</span>
              <div style={{ ...S.dot, backgroundColor: p.color }} />
              <span style={S.name}>{p.name}</span>
              <span style={S.rounds}>{p.roundsWon ?? 0}⚖️</span>
              <span style={S.score}>{p.score ?? 0}</span>
            </motion.div>
          ))}
        </div>

        <div style={S.footer}>
          {isHost ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Button variant="secondary" width="full" onClick={onChangeGame} disabled={advancing}>
                🎮 Cambia gioco
              </Button>
              <Button
                variant="primary"
                width="full"
                onClick={onReplay}
                disabled={advancing}
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' }}
              >
                {advancing ? '...' : '🔄 Rigioca'}
              </Button>
            </div>
          ) : (
            <p style={S.waitText}>Aspettando il boss... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
    gap: 'clamp(8px, 1.4dvh, 14px)',
    overflow: 'hidden',
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 'clamp(8px, 2vw, 16px)',
    flexShrink: 0,
    padding: 'clamp(4px, 1dvh, 12px) 0',
  },
  podiumSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    maxWidth: 110,
  },
  podiumName: {
    fontSize: 'clamp(11px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--text)',
    maxWidth: 90,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 'clamp(14px, 1.8dvh, 18px)',
    fontWeight: 800,
    color: ACCENT,
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.7dvh, 8px)',
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    scrollbarWidth: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2vw, 16px)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
  },
  rank: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    color: ACCENT,
    minWidth: 28,
    textAlign: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontWeight: 600,
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
  },
  rounds: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    color: 'var(--muted)',
    fontWeight: 700,
  },
  score: {
    fontWeight: 800,
    color: ACCENT,
    fontSize: 'clamp(15px, 1.8dvh, 19px)',
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  waitText: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 500,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default SentenzaFinal
