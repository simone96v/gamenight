// Schermata di fine partita per il single-player.
// Sostituisce la classifica completa in modalità local — c'è un solo giocatore,
// quindi mostriamo solo: blob del giocatore + risultato finale (con stats opzionali)
// + due bottoni: Rigioca / Cambia gioco.
//
// Layout coerente con il design system dell'app (CSS variables, light/dark auto).

import { motion } from 'framer-motion'
import AppHeader from './AppHeader'
import IconButton from './ui/IconButton'
import Button from './ui/Button'
import GradientTitle from './ui/GradientTitle'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

/**
 * Props:
 *   player: { name, color }
 *   gameEmoji: '🎬'
 *   gameName: 'Emoji Quiz'
 *   primaryValue: 1850        — il numero principale (score, metri, ...)
 *   primaryLabel: 'punti'     — la sua unità
 *   stats: [{ label, value }] — chip aggiuntivi opzionali (es. "5/7 corrette")
 *   onReplay, onChangeGame
 */
const SoloResultScreen = ({
  player,
  gameEmoji = '🏆',
  gameName = 'Risultato',
  primaryValue,
  primaryLabel = 'punti',
  stats = [],
  advancing = false,
  replayLabel = 'Rigioca',
  onReplay,
  onChangeGame,
  extraButton = null,    // { label, onClick } — bottone secondario opzionale sopra il footer
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Indietro" onClick={onChangeGame}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Hero: emoji gioco + titolo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={S.hero}
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
            style={S.gameEmoji}
          >
            {gameEmoji}
          </motion.div>
          <GradientTitle as="h1" size="lg" gradient={C.gradient}>
            {gameName}
          </GradientTitle>
        </motion.div>

        {/* Blob del giocatore */}
        {player && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            style={S.playerBox}
          >
            <MiniBlob color={player.color} expr={expr} size={64} id="solo-result-blob" />
            <span style={S.playerName}>{player.name}</span>
          </motion.div>
        )}

        {/* Numero principale */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={S.scoreBox}
        >
          <span style={{ ...S.scoreNum, color: C.accent }}>{primaryValue ?? 0}</span>
          <span style={S.scoreLabel}>{primaryLabel}</span>
        </motion.div>

        {/* Stats secondarie (opzionali) */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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

        {/* Footer: opzionale bottone extra + due bottoni standard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 420, marginTop: 'clamp(10px, 2dvh, 18px)' }}>
          {extraButton && (
            <Button variant="secondary" width="full" onClick={extraButton.onClick} disabled={advancing}>
              {extraButton.label}
            </Button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              width="full"
              onClick={onChangeGame}
              disabled={advancing}
            >
              Cambia gioco
            </Button>
            <Button
              variant="primary"
              width="full"
              onClick={onReplay}
              disabled={advancing}
              style={accentBtnStyle(C.accent)}
            >
              {advancing ? '...' : replayLabel}
            </Button>
          </div>
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
    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(14px, 2.5dvh, 22px)',
    overflow: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  gameEmoji: {
    fontSize: 'clamp(54px, 9dvh, 80px)',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.12))',
  },
  playerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 'clamp(10px, 1.5dvh, 14px) clamp(16px, 3vw, 22px)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  playerName: {
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontWeight: 800,
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
  },
  scoreNum: {
    fontSize: 'clamp(48px, 8dvh, 72px)',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  scoreLabel: {
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 700,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
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
    gap: 8,
    width: '100%',
    maxWidth: 420,
    marginTop: 'clamp(10px, 2dvh, 18px)',
  },
}

export default SoloResultScreen
