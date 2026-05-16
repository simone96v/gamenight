// GameLobbyLayout — schermata standard pre-gioco per tutti i giochi.
// Struttura: AppHeader + Hero (emoji + titolo + descrizione) + [children: settings]
//            + griglia giocatori (blob grandi + nome) + footer (bottone start / wait).
//
// Props:
//   gameEmoji, gameName, gameDescription
//   players, canControl, launching, disabled
//   startLabel (default "Gioca ora")
//   onStart, onBack
//   warning (stringa opzionale, es. "Servono almeno 3 giocatori")
//   children (slot per settings extra: stepper, ruota, ecc.)

import { motion } from 'framer-motion'
import AppHeader from './AppHeader'
import IconButton from './ui/IconButton'
import Button from './ui/Button'
import GradientTitle from './ui/GradientTitle'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const GameLobbyLayout = ({
  gameEmoji = '',
  gameName = '',
  gameDescription = '',
  players = [],
  canControl = false,
  launching = false,
  disabled = false,
  startLabel = 'Gioca ora',
  onStart,
  onBack,
  warning,
  children,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={canControl && onBack ? (
          <IconButton ariaLabel="Indietro" onClick={onBack}>←</IconButton>
        ) : null}
      />

      <div style={S.body}>
        {/* Hero: emoji + titolo + descrizione */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={S.hero}
        >
          <div style={S.emojiWrap}>{gameEmoji}</div>
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            {gameName}
          </GradientTitle>
          {gameDescription && (
            <p style={S.description}>{gameDescription}</p>
          )}
        </motion.div>

        {/* Slot per settings/custom content (wheel, steppers, ecc.) */}
        {children}

        {/* Griglia giocatori */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={S.playersCard}
        >
          <span style={S.sectionLabel}>
            Giocatori <span style={S.playerCount}>({players.length})</span>
          </span>
          <div style={S.playersGrid}>
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                style={S.playerCell}
              >
                <MiniBlob color={p.color} expr={expr} size={52} id={`lobby-p-${i}`} />
                <span style={S.playerName}>{p.name}</span>
              </motion.div>
            ))}
          </div>
          {warning && <p style={S.warning}>{warning}</p>}
        </motion.div>

        {/* Footer: bottone start o waiting (omesso se onStart è null — wheel-based games) */}
        {onStart && (
          <div style={S.footer}>
            {canControl ? (
              <Button
                variant="primary"
                width="full"
                onClick={onStart}
                disabled={launching || disabled}
                style={disabled ? undefined : accentBtnStyle(C.accent)}
              >
                {launching ? '⏳ Caricamento...' : startLabel}
              </Button>
            ) : (
              <p style={S.waitText}>Aspettando il boss... 👑</p>
            )}
          </div>
        )}
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
  },
  hero: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  emojiWrap: {
    fontSize: 'clamp(40px, 6dvh, 56px)',
    lineHeight: 1,
    marginBottom: 4,
  },
  description: {
    margin: '4px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 600,
    maxWidth: 320,
    lineHeight: 1.4,
  },
  playersCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(14px, 2dvh, 20px) clamp(14px, 3vw, 20px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 800,
    color: 'var(--text)',
    textAlign: 'center',
    display: 'block',
    width: '100%',
  },
  playerCount: {
    fontWeight: 600,
    color: 'var(--muted)',
  },
  playersGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 'clamp(8px, 1.5dvh, 14px)',
  },
  playerCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  playerName: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--text)',
    maxWidth: 72,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  warning: {
    margin: 0,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--danger)',
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
  },
  waitText: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 600,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default GameLobbyLayout
