// Risultati di fine round per Scramble: classifica del round + cumulativo,
// lista parole del giocatore locale.

import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { scoreWord } from '../data/dictionary'

const RACK_LEN = 7

const ScrambleResults = ({
  players,
  localPlayerId,
  rack,
  roundIdx,
  totalRounds,
  scrambleRoundResults,
  scrambleScores,
  scrambleWords,
  isHost,
  isOnline,
  advancing,
  onAdvance,
  onExit,
}) => {
  const C = usePlayerAccent()

  // Classifica round corrente (per i punti del round)
  const sorted = [...(players || [])].sort(
    (a, b) => (scrambleRoundResults[b.id] ?? 0) - (scrambleRoundResults[a.id] ?? 0),
  )

  const myWords = scrambleWords?.[localPlayerId] ?? []
  const isLast = roundIdx + 1 >= totalRounds
  const canAdvance = isHost || !isOnline

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
      />

      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: 'center' }}
        >
          <RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            Risultati round
          </GradientTitle>
          <p style={S.rackHint}>
            Rack: <strong style={{ color: C.accent, letterSpacing: '0.08em' }}>{rack}</strong>
          </p>
        </motion.div>

        {/* Classifica del round */}
        <div style={S.leaderboard}>
          {sorted.map((p, i) => {
            const roundPts = scrambleRoundResults[p.id] ?? 0
            const totalPts = scrambleScores[p.id] ?? 0
            const isLocal = p.id === localPlayerId
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
                style={{
                  ...S.lbRow,
                  border: isLocal ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                  background: isLocal ? `${C.accent}1a` : 'var(--surface)',
                }}
              >
                <span style={{ ...S.lbRank, color: i === 0 ? C.accent : 'var(--muted)' }}>
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <div style={{ ...S.lbDot, backgroundColor: p.color }} />
                <span style={S.lbName}>{p.name}</span>
                <div style={S.lbPts}>
                  <span style={{ ...S.lbRound, color: C.accent }}>+{roundPts}</span>
                  <span style={S.lbTotal}>{totalPts} tot</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Parole trovate dal giocatore locale */}
        <div style={S.myWordsCard}>
          <span style={S.myWordsTitle}>Le tue parole ({myWords.length})</span>
          <div className="scrollable-list" style={S.myWordsList}>
            {myWords.length === 0 ? (
              <p style={S.empty}>Nessuna parola trovata in questo round.</p>
            ) : (
              [...myWords]
                .sort((a, b) => b.length - a.length || a.localeCompare(b))
                .map((w) => {
                  const pts = scoreWord(w, RACK_LEN)
                  const isPangram = w.length === RACK_LEN
                  return (
                    <div
                      key={w}
                      style={{
                        ...S.wordChip,
                        background: isPangram ? `${C.accent}1a` : 'var(--bg)',
                        borderColor: isPangram ? C.accent : 'var(--border)',
                      }}
                    >
                      <span style={S.wordText}>{w}</span>
                      <span style={{ ...S.wordPts, color: isPangram ? C.accent : 'var(--muted)' }}>
                        +{pts}
                      </span>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        <div style={S.footer}>
          {canAdvance ? (
            <Button
              variant="primary"
              width="full"
              onClick={onAdvance}
              disabled={advancing}
              style={accentBtnStyle(C.accent)}
            >
              {advancing ? '...' : isLast ? '🏆 Classifica finale' : '➡️ Prossimo round'}
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
    padding: 'clamp(12px, 2dvh, 22px) clamp(14px, 4vw, 24px)',
    gap: 'clamp(10px, 1.6dvh, 16px)',
    overflow: 'hidden',
    minHeight: 0,
  },
  rackHint: {
    margin: '4px 0 0',
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    color: 'var(--muted)',
    fontWeight: 600,
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.6dvh, 6px)',
    flexShrink: 0,
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: 'clamp(8px, 1dvh, 10px) clamp(10px, 2vw, 14px)',
    borderRadius: 'var(--radius-sm)',
  },
  lbRank: {
    fontSize: 'clamp(13px, 1.5dvh, 15px)',
    fontWeight: 900,
    minWidth: 28,
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
    fontWeight: 700,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lbPts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
  },
  lbRound: {
    fontWeight: 900,
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontVariantNumeric: 'tabular-nums',
  },
  lbTotal: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    fontWeight: 700,
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  myWordsCard: {
    flex: 1,
    minHeight: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'clamp(10px, 1.5dvh, 14px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  myWordsTitle: {
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 800,
    color: 'var(--text)',
  },
  myWordsList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignContent: 'flex-start',
  },
  empty: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
  },
  wordChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    border: '1.5px solid var(--border)',
    borderRadius: 999,
  },
  wordText: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    letterSpacing: '0.04em',
    color: 'var(--text)',
  },
  wordPts: {
    fontWeight: 800,
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontVariantNumeric: 'tabular-nums',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
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

export default ScrambleResults
