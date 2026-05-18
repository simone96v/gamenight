// SoloEndScreen — schermata fullscreen di fine partita per la modalità solo.
// Mostra: emoji + nome gioco, player pill, score gigante con label, stats
// opzionali, e i 3 bottoni CTA: Rigioca / Classifica globale (opt) / Cambia gioco.
//
// Props:
//   gameEmoji: '🦘'
//   gameName: 'Blob Jump'
//   player: { name, color }
//   primaryValue, primaryLabel
//   stats: [{ label, value }] opzionali
//   onReplay, onChangeGame                — sempre presenti
//   onLeaderboard                         — opzionale; se presente, appare il
//                                           bottone "🏆 Classifica globale"
//   advancing: bool                       — disabilita i bottoni in transizione
//   replayLabel: default 'Rigioca'

import { motion } from 'framer-motion'
import AppHeader from './AppHeader'
import Button from './ui/Button'
import GradientTitle from './ui/GradientTitle'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const SPRING = { type: 'spring', stiffness: 320, damping: 26 }

const SoloEndScreen = ({
  gameEmoji = '🏆',
  gameName = 'Risultato',
  player,
  primaryValue = 0,
  primaryLabel = 'punti',
  stats = [],
  onReplay,
  onChangeGame,
  onLeaderboard,
  advancing = false,
  replayLabel = 'Rigioca',
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  return (
    <div className="screen screen-narrow" style={S.container}>
      <AppHeader accentColor={C.accent} />

      <div style={S.body}>
        <motion.div
          initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ ...SPRING, delay: 0.05 }}
          style={S.emoji}
        >
          {gameEmoji}
        </motion.div>

        <GradientTitle as="h1" size="lg" gradient={C.gradient}>
          {gameName}
        </GradientTitle>

        {player && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              ...S.playerPill,
              background: `color-mix(in srgb, ${C.accent} 10%, var(--surface))`,
              border: `1px solid ${C.accent}`,
            }}
          >
            <MiniBlob color={player.color} expr={expr} size={32} id="solo-end-blob" />
            <span style={S.playerName}>{player.name}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={S.scoreBox}
        >
          <span style={{ ...S.scoreNum, color: C.accent }}>{primaryValue}</span>
          <span style={S.scoreLabel}>{primaryLabel}</span>
        </motion.div>

        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            style={S.statsRow}
          >
            {stats.map((s, i) => (
              <div key={i} style={S.statChip}>
                <span style={S.statLabel}>{s.label}</span>
                <span style={{ ...S.statValue, color: C.accent }}>{s.value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div style={S.footer}>
        <Button
          variant="primary"
          width="full"
          onClick={onReplay}
          disabled={advancing}
          style={accentBtnStyle(C.accent)}
        >
          {advancing ? '...' : replayLabel}
        </Button>
        {onLeaderboard && (
          <Button
            variant="secondary"
            width="full"
            onClick={onLeaderboard}
            disabled={advancing}
          >
            🏆 Classifica globale
          </Button>
        )}
        <Button
          variant="secondary"
          width="full"
          onClick={onChangeGame}
          disabled={advancing}
        >
          Cambia gioco
        </Button>
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
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(10px, 1.8dvh, 16px)',
    textAlign: 'center',
  },
  emoji: {
    fontSize: 'clamp(56px, 10dvh, 80px)',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.18))',
  },
  playerPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: 'clamp(6px, 0.9dvh, 9px) clamp(12px, 2.5vw, 18px)',
    borderRadius: 999,
  },
  playerName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 700,
    fontSize: 'clamp(13px, 1.7dvh, 16px)',
    color: 'var(--text)',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scoreBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    marginTop: 'clamp(4px, 1dvh, 10px)',
  },
  scoreNum: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 900,
    fontSize: 'clamp(64px, 12dvh, 104px)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  scoreLabel: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 800,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    boxShadow: 'var(--shadow-sm)',
  },
  statLabel: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 600,
    color: 'var(--muted)',
  },
  statValue: {
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(12px, 2dvh, 20px) clamp(16px, 4vw, 28px) clamp(16px, 3dvh, 24px)',
  },
}

export default SoloEndScreen
