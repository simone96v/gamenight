// Risultati di fine round per Scramble. Layout:
// - Header: round badge + titolo + rack pill + definizione (se disponibile)
// - Stat hero del giocatore locale: punti round + parole + pangram count
// - Classifica compatta (mostrata solo se >= 2 giocatori)
// - Tabs per giocatore + parole trovate
// - Footer: bottone avanza

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import { accentBtnStyle, SPRING } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { scoreWord } from '../data/dictionary'
import { getRackDefinition } from '../data/definitions'

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
  // Final-mode props (l'ultimo round-end DIVENTA il final)
  isFinal = false,
  onReplay,
  onChangeGame,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  const safePlayers = useMemo(() => players || [], [players])
  const myWords = scrambleWords?.[localPlayerId] ?? []
  const myRoundPts = scrambleRoundResults?.[localPlayerId] ?? 0
  const myTotalPts = scrambleScores?.[localPlayerId] ?? 0
  const myPangrams = myWords.filter((w) => w.length === RACK_LEN).length

  const sortedByRound = useMemo(
    () => [...safePlayers].sort(
      (a, b) => (scrambleRoundResults?.[b.id] ?? 0) - (scrambleRoundResults?.[a.id] ?? 0),
    ),
    [safePlayers, scrambleRoundResults],
  )
  const showLeaderboard = safePlayers.length >= 2
  const showTabs = safePlayers.length >= 2

  // Tab attiva: parte sempre dal giocatore locale, se presente.
  const [activeTabId, setActiveTabId] = useState(() => {
    const me = safePlayers.find((p) => p.id === localPlayerId)
    return me?.id ?? safePlayers[0]?.id ?? null
  })

  // Se cambiano i giocatori (raro), riallinea la tab.
  useEffect(() => {
    if (!activeTabId) return
    if (safePlayers.some((p) => p.id === activeTabId)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTabId(safePlayers[0]?.id ?? null)
  }, [safePlayers, activeTabId])

  const activePlayer = safePlayers.find((p) => p.id === activeTabId)
  const activeWords = (scrambleWords?.[activeTabId] || [])
  const activeRoundPts = scrambleRoundResults?.[activeTabId] ?? 0
  const isViewingMe = activeTabId === localPlayerId

  const isLast = roundIdx + 1 >= totalRounds
  const canAdvance = isHost || !isOnline
  const definition = getRackDefinition(rack)

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
          {!isFinal && (
            <RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />
          )}
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            {isFinal ? 'Re delle Parole' : isLast ? 'Ultimo round!' : 'Round finito'}
          </GradientTitle>
          <div style={{ ...S.rackPill, borderColor: `${C.accent}40`, background: `${C.accent}14` }}>
            <span style={S.rackPillLabel}>Rack</span>
            <span style={{ ...S.rackPillValue, color: C.accent }}>{rack}</span>
          </div>
          {definition && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.3 }}
              style={{
                ...S.defBox,
                borderColor: `${C.accent}33`,
                background: `${C.accent}0d`,
              }}
            >
              <span style={{ ...S.defIcon, color: C.accent }} aria-hidden="true">📖</span>
              <p style={S.defText}>{definition}</p>
            </motion.div>
          )}
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

        {/* Parole trovate — con tabs per giocatore se multiplayer */}
        <div style={S.wordsCard}>
          <div style={S.wordsHeader}>
            <span style={S.sectionLabel}>
              {showTabs
                ? (isViewingMe ? 'Le tue parole' : `Parole di ${activePlayer?.name ?? '...'}`)
                : 'Le tue parole'}
            </span>
            <span style={{ ...S.wordsCount, color: C.accent }}>
              {activeWords.length}{activeRoundPts > 0 ? ` · +${activeRoundPts}` : ''}
            </span>
          </div>

          {showTabs && (
            <div className="scrollable-tabs" style={S.tabs} role="tablist" aria-label="Giocatori">
              {safePlayers.map((p) => {
                const isActive = p.id === activeTabId
                const count = (scrambleWords?.[p.id] || []).length
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTabId(p.id)}
                    style={{
                      ...S.tab,
                      borderColor: isActive ? p.color : 'var(--border)',
                      background: isActive ? `${p.color}1f` : 'var(--bg)',
                      color: isActive ? 'var(--text)' : 'var(--muted)',
                      fontWeight: isActive ? 800 : 600,
                    }}
                  >
                    <MiniBlob color={p.color} expr={expr} size={20} id={`tab-${p.id}`} />
                    <span style={S.tabName}>
                      {p.id === localPlayerId ? 'Tu' : p.name}
                    </span>
                    <span style={S.tabCount}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="scrollable-list" style={S.wordsList}>
            {activeWords.length === 0 ? (
              <p style={S.empty}>
                {isViewingMe
                  ? 'Nessuna parola in questo round.'
                  : `${activePlayer?.name ?? 'Giocatore'} non ha trovato parole.`}
              </p>
            ) : (
              [...activeWords]
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
          {isFinal ? (
            canAdvance ? (
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
            )
          ) : canAdvance ? (
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
  defBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'clamp(8px, 1.6vw, 10px)',
    padding: 'clamp(8px, 1.2dvh, 10px) clamp(12px, 3vw, 16px)',
    border: '1.5px solid',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    maxWidth: 520,
    marginTop: 6,
  },
  defIcon: {
    fontSize: 'clamp(14px, 1.8dvh, 16px)',
    lineHeight: 1.4,
    flexShrink: 0,
  },
  defText: {
    margin: 0,
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 600,
    color: 'var(--text)',
    lineHeight: 1.35,
    textAlign: 'left',
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
  tabs: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: 4,
    scrollbarWidth: 'none',
    flexShrink: 0,
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px 6px 6px',
    border: '1.5px solid',
    borderRadius: 999,
    cursor: 'pointer',
    fontSize: 'clamp(11px, 1.35dvh, 13px)',
    flexShrink: 0,
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  },
  tabName: {
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tabCount: {
    fontVariantNumeric: 'tabular-nums',
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    background: 'rgba(0,0,0,0.08)',
    padding: '1px 6px',
    borderRadius: 999,
    minWidth: 18,
    textAlign: 'center',
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
