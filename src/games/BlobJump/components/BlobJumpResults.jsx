import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import PlayerAvatar from '../../../components/PlayerAvatar'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const BlobJumpResults = ({
  players,
  localPlayerId,
  isHost,
  roundScores,
  currentRoundIdx,
  totalRounds,
  advancing,
  onAdvance,
  // Final-mode props (l'ultimo round-end DIVENTA il final)
  isFinal = false,
  totalScores = null,
  onReplay,
  onChangeGame,
  onShowLeaderboard,
}) => {
  const C = usePlayerAccent()
  const scores = isFinal && totalScores ? totalScores : roundScores
  const sorted = [...(players || [])].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
  )
  const topScore = scores[sorted[0]?.id] ?? 1

  return (
    <div style={S.container}>
      <AppHeader accentColor={C.accent} />
      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          {!isFinal && (
            <RoundBadge
              n={currentRoundIdx + 1}
              total={totalRounds}
              accentColor={C.accent}
            />
          )}
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            {isFinal ? 'Re del Salto' : 'Risultati'}
          </GradientTitle>
        </motion.div>

        {/* Height visualization — blobs at different heights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={S.heightViz}
        >
          <div style={S.heightColumns}>
            {sorted.map((p, i) => {
              const score = scores[p.id] ?? 0
              const pct = topScore > 0 ? Math.max(8, (score / topScore) * 100) : 8
              const isLocal = p.id === localPlayerId
              return (
                <div key={p.id} style={S.column}>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${pct}%`, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      ...S.columnBar,
                      background: `linear-gradient(180deg, ${p.color}40 0%, ${p.color} 100%)`,
                      border: isLocal ? `2px solid ${C.accent}` : '2px solid transparent',
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
                      style={S.blobTop}
                    >
                      {i === 0 && <span style={S.crown}>👑</span>}
                      <PlayerAvatar player={p} showScore={false} size="sm" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    style={S.columnLabel}
                  >
                    <span style={S.colName}>{p.name}</span>
                    <span style={{ ...S.colScore, color: i === 0 ? C.accent : 'var(--text)' }}>
                      {score}m
                    </span>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Leaderboard list */}
        <div style={S.leaderboard}>
          {sorted.map((p, i) => {
            const score = scores[p.id] ?? 0
            const isLocal = p.id === localPlayerId
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                style={{
                  ...S.lbRow,
                  border: isLocal ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                  background: isLocal ? `${C.accent}1a` : 'var(--bg)',
                }}
              >
                <span style={{ ...S.lbRank, color: C.accent }}>#{i + 1}</span>
                <div style={{ ...S.lbDot, backgroundColor: p.color }} />
                <span style={S.lbName}>{p.name}</span>
                <span style={{ ...S.lbScore, color: C.accent }}>{score}m</span>
              </motion.div>
            )
          })}
        </div>

        <div style={S.footer}>
          {isFinal ? (
            <>
              {onShowLeaderboard && (
                <Button variant="secondary" width="full" onClick={onShowLeaderboard}>
                  🏆 Classifica globale
                </Button>
              )}
              {isHost ? (
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <Button variant="secondary" width="full" onClick={onChangeGame} disabled={advancing}>
                    Cambia gioco
                  </Button>
                  <Button variant="primary" width="full" onClick={onReplay} disabled={advancing} style={accentBtnStyle(C.accent)}>
                    {advancing ? '...' : 'Rigioca'}
                  </Button>
                </div>
              ) : (
                <p style={S.waitText}>Aspettando il boss... 👑</p>
              )}
            </>
          ) : isHost ? (
            <Button
              variant="primary"
              width="full"
              onClick={onAdvance}
              disabled={advancing}
              style={accentBtnStyle(C.accent)}
            >
              {advancing ? '...' : 'Prossimo round'}
            </Button>
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
    gap: 'clamp(8px, 1.2dvh, 14px)',
    overflow: 'auto',
  },
  heightViz: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(16px, 2.5dvh, 24px) clamp(12px, 2vw, 20px)',
    minHeight: 'clamp(160px, 28dvh, 240px)',
  },
  heightColumns: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 'clamp(8px, 2vw, 16px)',
    height: '100%',
    minHeight: 'clamp(120px, 22dvh, 200px)',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: 70,
    height: '100%',
    justifyContent: 'flex-end',
  },
  columnBar: {
    width: '100%',
    borderRadius: 'clamp(8px, 1vw, 12px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    minHeight: 20,
  },
  blobTop: {
    position: 'relative',
    marginTop: -16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  crown: {
    fontSize: 16,
    marginBottom: -4,
  },
  columnLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 6,
    gap: 1,
  },
  colName: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    fontWeight: 700,
    color: 'var(--text)',
    maxWidth: 60,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  colScore: {
    fontSize: 'clamp(12px, 1.5dvh, 15px)',
    fontWeight: 900,
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.6dvh, 6px)',
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: 'clamp(8px, 1dvh, 10px) clamp(10px, 2vw, 14px)',
    borderRadius: 'var(--radius-sm)',
  },
  lbRank: {
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 800,
    minWidth: 24,
    textAlign: 'center',
  },
  lbDot: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    flexShrink: 0,
  },
  lbName: {
    flex: 1,
    fontWeight: 600,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
  },
  lbScore: {
    fontWeight: 800,
    fontSize: 'clamp(13px, 1.6dvh, 17px)',
    minWidth: 36,
    textAlign: 'right',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
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

export default BlobJumpResults
