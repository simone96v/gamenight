// GameLobbyLayout — schermata standard pre-gioco per tutti i giochi.
// Stile: ricalca SoloSetupScreen.
// Ordine verticale:
//   titolo gioco → descrizione → blob locale → nome → (altri giocatori)
//   → card impostazioni → CTA.
//
// Props:
//   gameEmoji (opzionale, sopra il titolo come accent)
//   gameName, gameDescription
//   players, canControl, launching, disabled
//   startLabel (default "Gioca" — CTA canonica di tutte le lobby)
//   onStart, onBack
//   warning (stringa opzionale, es. "Servono almeno 3 giocatori")
//   children (slot impostazioni: stepper, ruota, chip, ecc.)

import { motion } from 'framer-motion'
import AppHeader from './AppHeader'
import IconButton from './ui/IconButton'
import Button from './ui/Button'
import GradientTitle from './ui/GradientTitle'
import Blob from './Blob'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import TapShockwaves from './TapShockwaves'
import TappableMiniBlob from './TappableMiniBlob'
import { useTapShockwave } from '../hooks/useTapShockwave'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'
import { useSession } from '../stores/useSession'

const GameLobbyLayout = ({
  gameEmoji = '',
  gameName = '',
  gameDescription = '',
  players = [],
  canControl = false,
  launching = false,
  disabled = false,
  startLabel = 'Gioca',
  onStart,
  onBack,
  warning,
  headerActions = null,
  children,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()
  const localPlayerId = useSession((s) => s.localPlayerId)
  const localPlayer = players.find((p) => p.id === localPlayerId) ?? players[0]
  const others = players.filter((p) => p.id !== localPlayer?.id)
  const blobColor = localPlayer?.color
  const playerName = localPlayer?.name || 'Tu'

  // Blob locale tappabile: onda + cambio espressione momentaneo.
  const { tapExpr: localTapExpr, waves: localWaves, onTap: localTap, removeWave: removeLocalWave } = useTapShockwave()

  return (
    <div className="screen screen-narrow" style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={canControl && onBack ? (
          <IconButton ariaLabel="Indietro" onClick={onBack}>←</IconButton>
        ) : null}
        actions={headerActions}
      />

      <div style={S.body}>
        {/* 1. Titolo + 2. Descrizione */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={S.hero}
        >
          {gameEmoji && <div style={S.emojiWrap}>{gameEmoji}</div>}
          <GradientTitle as="h1" size="lg" gradient={C.gradient}>
            {gameName}
          </GradientTitle>
          {gameDescription && <p style={S.description}>{gameDescription}</p>}
        </motion.div>

        {/* 3. Identità: blob locale + nome (+ altri giocatori se presenti) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={S.identityWrap}
        >
          <div
            onClick={localTap}
            role="button"
            aria-label="Tocca il tuo blob"
            style={{
              position: 'relative',
              width: 'clamp(110px, 20dvh, 168px)',
              aspectRatio: '1 / 1',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <TapShockwaves
              waves={localWaves}
              removeWave={removeLocalWave}
              color={blobColor || '#9CA3AF'}
            />
            <Blob
              color={blobColor}
              expr={localTapExpr || expr}
              id="lobby-local-blob"
              size="100%"
              animate={false}
              style={{ ...blobInlineStyle, position: 'relative', zIndex: 2 }}
            />
          </div>
          <span
            style={{
              ...S.playerNameBadge,
              borderColor: C.accent,
              color: 'var(--text)',
              background: `${C.accent}14`,
            }}
          >
            {playerName}
          </span>

          {others.length > 0 && (
            <div style={S.othersWrap}>
              <span style={S.othersLabel}>
                con {others.length} {others.length === 1 ? 'altro' : 'altri'}
              </span>
              <div style={S.othersGrid}>
                {others.slice(0, 8).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.12 + i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                    style={S.othersCell}
                    title={p.name}
                  >
                    <TappableMiniBlob color={p.color} expr={expr} size={28} id={`lobby-other-${i}`} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* 4. Card impostazioni (solo se ci sono children) */}
        {children && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={S.settingsCard}
            aria-labelledby="lobby-settings-title"
          >
            <div style={S.settingsHeader}>
              <span style={{ ...S.settingsIcon, color: C.accent }}>⚙️</span>
              <h2 id="lobby-settings-title" style={S.settingsTitle}>
                Impostazioni
              </h2>
            </div>
            <div style={S.settingsBody}>{children}</div>
          </motion.section>
        )}

        {warning && <p style={S.warning}>{warning}</p>}

        {/* 5. CTA */}
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
                {launching ? 'Caricamento...' : startLabel}
              </Button>
            ) : (
              <p style={S.waitText}>
                {players.length > 1
                  ? `Aspettando il boss... 👑 (${players.length} giocatori)`
                  : 'Aspettando il boss... 👑'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const blobInlineStyle = {
  position: 'relative',
  left: 'auto',
  right: 'auto',
  top: 'auto',
  bottom: 'auto',
  transform: 'none',
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
    padding: 'clamp(12px, 2.5dvh, 28px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(10px, 1.6dvh, 18px)',
    overflowY: 'auto',
    scrollbarWidth: 'none',
  },
  hero: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  emojiWrap: {
    fontSize: 'clamp(34px, 5dvh, 48px)',
    lineHeight: 1,
    marginBottom: 2,
  },
  description: {
    margin: '4px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.5dvh, 15px)',
    fontWeight: 600,
    maxWidth: 320,
    lineHeight: 1.4,
  },
  identityWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(6px, 1dvh, 10px)',
    flexShrink: 0,
    margin: 'clamp(2px, 0.5dvh, 6px) 0',
  },
  playerNameBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'clamp(4px, 0.7dvh, 6px) clamp(12px, 3vw, 18px)',
    borderRadius: 999,
    border: '1.5px solid',
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 18px)',
    letterSpacing: '-0.01em',
    maxWidth: '70%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  othersWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginTop: 'clamp(2px, 0.5dvh, 6px)',
  },
  othersLabel: {
    fontSize: 'clamp(10px, 1.2dvh, 12px)',
    color: 'var(--muted)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  othersGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  othersCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'clamp(12px, 2dvh, 18px) clamp(14px, 3vw, 20px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(10px, 1.6dvh, 14px)',
    flexShrink: 0,
  },
  settingsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  settingsIcon: {
    fontSize: 'clamp(16px, 2dvh, 20px)',
    lineHeight: 1,
  },
  settingsTitle: {
    margin: 0,
    fontSize: 'clamp(13px, 1.5dvh, 15px)',
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '0.02em',
  },
  settingsBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(8px, 1.4dvh, 12px)',
  },
  warning: {
    margin: 0,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--danger)',
    textAlign: 'center',
    flexShrink: 0,
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
    paddingTop: 'clamp(6px, 1dvh, 10px)',
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
