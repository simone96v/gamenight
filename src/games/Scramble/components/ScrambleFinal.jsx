// Classifica finale di Scramble (multi-player).

import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import PlayerAvatar from '../../../components/PlayerAvatar'
import GameSection from '../../../components/ui/GameSection'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const PODIUM_EMOJIS = ['🥇', '🥈', '🥉']

const ScrambleFinal = ({
  players,
  localPlayerId,
  scrambleScores = {},
  scrambleWords = {},
  isHost,
  onReplay,
  onChangeGame,
}) => {
  const C = usePlayerAccent()
  const sorted = [...(players || [])].sort(
    (a, b) => (scrambleScores[b.id] ?? b.score ?? 0) - (scrambleScores[a.id] ?? a.score ?? 0),
  )

  return (
    <div style={S.container}>
      <AppHeader accentColor={C.accent} />
      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            🔤 Re delle Parole
          </GradientTitle>
          <p style={S.subtitle}>Classifica finale</p>
        </motion.div>

        {sorted.length >= 2 && (
          <div style={S.podium}>
            {[1, 0, 2].map((rank) => {
              const p = sorted[rank]
              if (!p) return <div key={rank} style={{ flex: 1 }} />
              const isFirst = rank === 0
              const score = scrambleScores[p.id] ?? p.score ?? 0
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
                  <span style={{ ...S.podiumScore, color: C.accent }}>{score}</span>
                </motion.div>
              )
            })}
          </div>
        )}

        <GameSection emoji="📊" title="Tutti i risultati" delay={0.3}>
          <div style={S.leaderboard}>
            {sorted.map((p, i) => {
              const score = scrambleScores[p.id] ?? p.score ?? 0
              const wordCount = (scrambleWords[p.id]?.length) ?? 0
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  style={{
                    ...S.lbRow,
                    border: p.id === localPlayerId ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                    background: p.id === localPlayerId ? `${C.accent}1a` : 'var(--bg)',
                  }}
                >
                  <span style={{ ...S.lbRank, color: C.accent }}>#{i + 1}</span>
                  <div style={{ ...S.lbDot, backgroundColor: p.color }} />
                  <span style={S.lbName}>{p.name}</span>
                  <span style={S.lbWords}>{wordCount} parole</span>
                  <span style={{ ...S.lbScore, color: C.accent }}>{score}</span>
                </motion.div>
              )
            })}
          </div>
        </GameSection>

        <div style={S.footer}>
          {isHost ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Button variant="secondary" width="full" onClick={onChangeGame}>
                Cambia gioco
              </Button>
              <Button variant="primary" width="full" onClick={onReplay} style={accentBtnStyle(C.accent)}>
                Gioca ancora
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
    padding: 'clamp(12px, 2dvh, 22px) clamp(12px, 3vw, 22px)',
    gap: 'clamp(8px, 1.4dvh, 14px)',
    overflow: 'hidden',
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 600,
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
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
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
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2vw, 16px)',
    borderRadius: 'var(--radius-sm)',
  },
  lbRank: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    minWidth: 28,
    textAlign: 'center',
  },
  lbDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    flexShrink: 0,
  },
  lbName: {
    flex: 1,
    fontWeight: 600,
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
  },
  lbWords: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--muted)',
    marginRight: 8,
  },
  lbScore: {
    fontWeight: 900,
    fontSize: 'clamp(15px, 1.8dvh, 19px)',
    minWidth: 40,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
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

export default ScrambleFinal
