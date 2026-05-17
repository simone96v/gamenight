// Risultati di fine round per Scramble. Layout:
// - Header: round badge + titolo "Round X finito"
// - Stat hero del giocatore locale: punti round + parole + pangram count
// - Classifica compatta (mostrata solo se >= 2 giocatori)
// - Parole trovate del giocatore locale a chip
// - Footer: bottone avanza

import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import { accentBtnStyle, SPRING } from '../../../theme/gameColors'
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

  const myWords = scrambleWords?.[localPlayerId] ?? []
  const myRoundPts = scrambleRoundResults?.[localPlayerId] ?? 0
  const myTotalPts = scrambleScores?.[localPlayerId] ?? 0
  const myPangrams = myWords.filter((w) => w.length === RACK_LEN).length

  const sortedByRound = [...(players || [])].sort(
    (a, b) => (scrambleRoundResults?.[b.id] ?? 0) - (scrambleRoundResults?.[a.id] ?? 0),
  )
  const showLeaderboard = (players?.length ?? 0) >= 2

  const isLast = roundIdx + 1 >= totalRounds
  const canAdvance = isHost || !isOnline

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={S.header}
        >
          <RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            {isLast ? 'Ultimo round!' : 'Round finito'}
          </GradientTitle>
          <div style={{ ...S.rackPill, borderColor: `${C.accent}40`, background: `${C.accent}14` }}>
            <span style={S.rackPillLabel}>Rack</span>
            <span style={{ ...S.rackPillValue, color: C.accent }}>{rack}</span>
          </div>
        </motion.div>

        {/* Hero stats del giocatore locale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          style={{
            ...S.heroCard,
            background: `linear-gradient(135deg, ${C.accent}1a 0%, ${C.accent}0a 100%)`,
            borderColor: `${C.accent}33`,
          }}
        >
          <div style={S.heroBig}>
            <span style={{ ...S.heroValue, color: C.accent }}>+{myRoundPts}</span>
            <span style={S.heroLabel}>punti round</span>
          </div>
          <div style={S.heroDivider} />
          <div style={S.heroStats}>
            <div style={S.heroStat}>
              <span style={S.heroStatValue}>{myWords.length}</span>
              <span style={S.heroStatLabel}>parole</span>
            </div>
            <div style={S.heroStat}>
              <span style={{ ...S.heroStatValue, color: myPangrams > 0 ? C.accent : 'var(--text)' }}>{myPangrams}</span>
              <span style={S.heroStatLabel}>pangram</span>
            </div>
            <div style={S.heroStat}>
              <span style={S.heroStatValue}>{myTotalPts}</span>
              <span style={S.heroStatLabel}>totale</span>
            </div>
          </div>
        </motion.div>

        {/* Classifica round (solo se multiplayer) */}
        {showLeaderboard && (
          <div style={S.leaderboard}>
            <span style={S.sectionLabel}>Classifica del round</span>
            {sortedByRound.map((p, i) => {
              const roundPts = scrambleRoundResults?.[p.id] ?? 0
              const totalPts = scrambleScores?.[p.id] ?? 0
              const isLocal = p.id === localPlayerId
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
                  style={{
                    ...S.lbRow,
                    border: isLocal ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                    background: isLocal ? `${C.accent}14` : 'var(--surface)',
                  }}
                >
                  <span style={{ ...S.lbRank, color: i === 0 ? C.accent : 'var(--muted)' }}>
                    {i === 0 ? '👑' : `#${i + 1}`}
                  </span>
                  <div style={{ ...S.lbDot, backgroundColor: p.color }} />
                  <span style={S.lbName}>{p.name}</span>
                  <span style={{ ...S.lbRound, color: C.accent }}>+{roundPts}</span>
                  <span style={S.lbTotal}>{totalPts}</span>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Parole trovate (chip) */}
        <div style={S.wordsCard}>
          <div style={S.wordsHeader}>
            <span style={S.sectionLabel}>Le tue parole</span>
            <span style={{ ...S.wordsCount, color: C.accent }}>{myWords.length}</span>
          </div>
          <div className="scrollable-list" style={S.wordsList}>
            {myWords.length === 0 ? (
              <p style={S.empty}>Nessuna parola in questo round.</p>
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
                        background: isPangram ? `${C.accent}1f` : 'var(--bg)',
                        borderColor: isPangram ? C.accent : 'var(--border)',
                      }}
                    >
                      <span style={S.wordText}>{w}</span>
                      <span style={{ ...S.wordPts, color: isPangram ? C.accent : 'var(--muted)' }}>+{pts}</span>
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
              {advancing ? '...' : isLast ? 'Classifica finale' : 'Prossimo round'}
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
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(4px, 0.8dvh, 8px)',
    flexShrink: 0,
  },
  rackPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: 'clamp(4px, 0.8dvh, 6px) clamp(10px, 2vw, 14px)',
    border: '1.5px solid',
    borderRadius: 999,
    marginTop: 4,
  },
  rackPillLabel: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  rackPillValue: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontWeight: 900,
    letterSpacing: '0.12em',
  },
  heroCard: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 'clamp(12px, 3vw, 18px)',
    padding: 'clamp(14px, 2.4dvh, 20px) clamp(16px, 4vw, 22px)',
    border: '1.5px solid',
    borderRadius: 'var(--radius)',
    flexShrink: 0,
  },
  heroBig: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    flex: '0 0 auto',
  },
  heroValue: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(34px, 7dvh, 52px)',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  heroLabel: {
    marginTop: 4,
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  heroDivider: {
    width: 1,
    background: 'var(--border)',
    flexShrink: 0,
  },
  heroStats: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'clamp(6px, 1.5vw, 10px)',
    alignItems: 'center',
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    fontSize: 'clamp(18px, 2.6dvh, 22px)',
    fontWeight: 900,
    color: 'var(--text)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  heroStatLabel: {
    fontSize: 'clamp(10px, 1.1dvh, 11px)',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 800,
    color: 'var(--muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
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
    width: 14,
    height: 14,
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
  lbRound: {
    fontWeight: 900,
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 36,
    textAlign: 'right',
  },
  lbTotal: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 32,
    textAlign: 'right',
  },
  wordsCard: {
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
  wordsHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  wordsCount: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  wordsList: {
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
    width: '100%',
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    padding: 'clamp(8px, 1.5dvh, 14px) 0',
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
