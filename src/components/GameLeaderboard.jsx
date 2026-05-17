// GameLeaderboard — schermata canonica di fine partita per TUTTI i giochi.
// Sostituisce: FinalPhase, MappaFinal, SentenzaFinal, EmojiQuizFinalPhase,
//              BlobJumpFinal, ScrambleFinal, SoloResultScreen.
//
// Struttura:
//   1. Hero (titolo + sottotitolo opzionale)
//   2. Podium top 3 (solo se >= 2 giocatori) — ordine visivo 2°, 1°, 3°
//   3. Tabella classifica (rank, blob, nome, stat extra opzionale, score)
//   4. Slot `extras` per UI gioco-specifica (height bars, word chips, MVP awards, ecc.)
//   5. Footer CTA: host vede "Cambia gioco" + "Rigioca"/"Prossimo round"; altri vedono attesa
//
// Props principali:
//   players: [{ id, name, color, score, ...extra }]
//   localPlayerId
//   gameName, subtitle (opzionale)
//   extraColumn: { label, get(player), suffix? } — colonna stat custom
//   extras: React node — UI gioco-specifica inserita tra tabella e footer
//   isFinal (default true) / hasMoreRounds — controlla label bottone replay
//   canControl: bool (host o solo)
//   advancing: bool
//   replayLabel, nextRoundLabel — override testi (opzionali)
//   onReplay, onChangeGame

import { motion } from 'framer-motion'
import AppHeader from './AppHeader'
import IconButton from './ui/IconButton'
import Button from './ui/Button'
import GradientTitle from './ui/GradientTitle'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

/* ── Corona SVG per il 1° posto ── */
const Crown = ({ size = 28 }) => (
  <svg viewBox="0 0 100 80" width={size} height={size * 0.8} style={{ display: 'block' }}>
    <polygon
      points="10,60 20,25 35,45 50,10 65,45 80,25 90,60"
      fill="#FBBF24"
      stroke="#F59E0B"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <rect x="10" y="58" width="80" height="12" rx="4" fill="#FBBF24" stroke="#F59E0B" strokeWidth="3" />
    <circle cx="50" cy="10" r="5" fill="#FDE68A" />
    <circle cx="20" cy="25" r="4" fill="#FDE68A" />
    <circle cx="80" cy="25" r="4" fill="#FDE68A" />
  </svg>
)

const RANK_COLORS = ['#FBBF24', '#C0C0C0', '#CD7F32']
const RANK_LABELS = ['1st', '2nd', '3rd']

const PodiumBlob = ({ player, rank, expr, blobSize, delay }) => {
  const isFirst = rank === 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isFirst ? 6 : 4,
        flex: 1,
        maxWidth: isFirst ? 130 : 110,
      }}
    >
      <div style={{ height: isFirst ? 28 : 0, display: 'flex', alignItems: 'flex-end' }}>
        {isFirst && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.3, type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Crown size={32} />
          </motion.div>
        )}
      </div>

      <motion.div
        animate={isFirst ? { scale: [1, 1.06, 1] } : {}}
        transition={isFirst ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : {}}
      >
        <MiniBlob color={player.color} expr={expr} size={blobSize} id={`podium-${rank}`} />
      </motion.div>

      <span style={{
        fontSize: isFirst ? 'clamp(13px, 1.6dvh, 16px)' : 'clamp(11px, 1.3dvh, 13px)',
        fontWeight: 700,
        color: 'var(--text)',
        maxWidth: isFirst ? 110 : 90,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {player.name}
      </span>

      <div style={{
        background: `linear-gradient(135deg, ${RANK_COLORS[rank]}22, ${RANK_COLORS[rank]}11)`,
        border: `1.5px solid ${RANK_COLORS[rank]}55`,
        borderRadius: 'var(--radius-sm)',
        padding: isFirst
          ? 'clamp(8px, 1.2dvh, 12px) clamp(16px, 3vw, 24px)'
          : 'clamp(6px, 1dvh, 10px) clamp(12px, 2.5vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}>
        <span style={{
          fontSize: isFirst ? 'clamp(20px, 2.6dvh, 26px)' : 'clamp(16px, 2dvh, 20px)',
          fontWeight: 900,
          color: RANK_COLORS[rank],
          lineHeight: 1,
        }}>
          {player.score ?? 0}
        </span>
        <span style={{
          fontSize: 'clamp(9px, 1dvh, 11px)',
          fontWeight: 700,
          color: RANK_COLORS[rank],
          opacity: 0.7,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {RANK_LABELS[rank]}
        </span>
      </div>
    </motion.div>
  )
}

const GameLeaderboard = ({
  players = [],
  localPlayerId = null,
  gameName = '',
  subtitle = '',
  extraColumn = null, // { label, get(player), suffix? }
  extras = null,
  hasMoreRounds = false,
  canControl = true,
  advancing = false,
  replayLabel = 'Rigioca',
  nextRoundLabel = 'Prossimo round',
  changeGameLabel = 'Cambia gioco',
  onReplay,
  onChangeGame,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const showPodium = sorted.length >= 2
  const primaryLabel = hasMoreRounds ? nextRoundLabel : replayLabel

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={onChangeGame ? (
          <IconButton ariaLabel="Indietro" onClick={onChangeGame}>←</IconButton>
        ) : null}
      />

      <div style={S.body}>
        {/* Titolo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', flexShrink: 0 }}
        >
          <GradientTitle as="h1" size="lg" gradient={C.gradient}>
            {gameName || 'Classifica'}
          </GradientTitle>
          {subtitle && (
            <p style={S.subtitle}>{subtitle}</p>
          )}
        </motion.div>

        {/* Podium top 3 — ordine visivo 2°, 1°, 3° */}
        {showPodium && (
          <div style={S.podium}>
            {[1, 0, 2].map((rank) => {
              const p = sorted[rank]
              if (!p) return <div key={rank} style={{ flex: 1 }} />
              const isFirst = rank === 0
              return (
                <PodiumBlob
                  key={p.id}
                  player={p}
                  rank={rank}
                  expr={isFirst ? 'happy' : expr}
                  blobSize={isFirst ? 64 : 48}
                  delay={rank === 0 ? 0.3 : rank === 1 ? 0.1 : 0.5}
                />
              )
            })}
          </div>
        )}

        {/* Tabella classifica */}
        <div style={S.leaderboard}>
          {sorted.map((p, i) => {
            const isLocal = p.id === localPlayerId
            const extraValue = extraColumn ? extraColumn.get(p) : null
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                style={{
                  ...S.row,
                  border: isLocal ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                  background: isLocal ? `${C.accent}14` : 'var(--surface)',
                }}
              >
                <span style={{ ...S.rank, color: C.accent }}>#{i + 1}</span>
                <MiniBlob color={p.color} expr={expr} size={28} id={`lb-${p.id}-${i}`} />
                <span style={S.playerName}>{p.name}</span>
                {extraColumn && extraValue != null && (
                  <span style={S.extraStat}>
                    {extraValue}
                    {extraColumn.suffix && <span style={{ opacity: 0.7 }}> {extraColumn.suffix}</span>}
                    {extraColumn.label && (
                      <span style={{ opacity: 0.7, marginLeft: 4 }}>{extraColumn.label}</span>
                    )}
                  </span>
                )}
                <span style={{ ...S.score, color: C.accent }}>{p.score ?? 0}</span>
              </motion.div>
            )
          })}
        </div>

        {/* Slot extras: game-specific UI (height bars, words, MVP, ecc.) */}
        {extras && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={S.extrasWrap}
          >
            {extras}
          </motion.div>
        )}

        {/* Footer CTA */}
        <div style={S.footer}>
          {canControl ? (
            <div style={S.footerBtns}>
              {onChangeGame && (
                <Button
                  variant="secondary"
                  width="full"
                  onClick={onChangeGame}
                  disabled={advancing}
                >
                  {changeGameLabel}
                </Button>
              )}
              {onReplay && (
                <Button
                  variant="primary"
                  width="full"
                  onClick={onReplay}
                  disabled={advancing}
                  style={accentBtnStyle(C.accent)}
                >
                  {advancing ? '...' : primaryLabel}
                </Button>
              )}
            </div>
          ) : (
            <p style={S.waiting}>Aspettando il boss... 👑</p>
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
    padding: 'clamp(12px, 2dvh, 22px) clamp(14px, 4vw, 28px)',
    gap: 'clamp(10px, 1.6dvh, 18px)',
    overflowY: 'auto',
    scrollbarWidth: 'none',
  },
  subtitle: {
    margin: '4px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 600,
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 'clamp(6px, 1.5vw, 14px)',
    flexShrink: 0,
    padding: 'clamp(2px, 0.6dvh, 8px) 0',
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.7dvh, 8px)',
    flexShrink: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: 'clamp(8px, 1.1dvh, 12px) clamp(10px, 2vw, 16px)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
  },
  rank: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    minWidth: 28,
    textAlign: 'center',
  },
  playerName: {
    flex: 1,
    fontWeight: 600,
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  extraStat: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    color: 'var(--muted)',
    fontWeight: 700,
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  score: {
    fontWeight: 900,
    fontSize: 'clamp(15px, 1.9dvh, 19px)',
    minWidth: 40,
    textAlign: 'right',
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  extrasWrap: {
    flexShrink: 0,
  },
  footer: {
    flexShrink: 0,
    marginTop: 'auto',
  },
  footerBtns: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  waiting: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 600,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default GameLeaderboard
