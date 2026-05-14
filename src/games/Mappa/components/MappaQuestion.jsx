import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import MapView from './MapView'
import { accentBtnStyle, GAME_COLORS } from '../../../theme/gameColors'

const MAPPA = GAME_COLORS.mappa

const MappaQuestion = ({
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  timerDuration,
  players,
  localPlayerId,
  isHost,
  localPin,
  confirmed,
  isExpired,
  submittedPins,
  onPinDrop,
  onConfirm,
  onExit,
}) => {
  if (!question) return null

  const canConfirm = !!localPin && !confirmed && !isExpired
  const myPlayer = players?.find((p) => p.id === localPlayerId)
  const myColor = myPlayer?.color ?? MAPPA.accent
  const urgent = timeLeft <= 5
  const timerFraction = timeLeft / timerDuration
  const R = 16
  const CIRCUM = 2 * Math.PI * R

  const pins = localPin
    ? [{ lat: localPin.lat, lng: localPin.lng, color: myColor, id: 'me', animated: true }]
    : []

  return (
    <div style={S.container}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} game="mappa" />}
      />

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={S.questionBar}
      >
        <span style={S.questionEmoji}>🗺️</span>
        <p style={S.questionText}>{question.question}</p>
        <div style={S.timerRing}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={R} fill="none" stroke="var(--surface2)" strokeWidth="3" />
            <motion.circle
              cx="20" cy="20" r={R}
              fill="none"
              stroke={urgent ? 'var(--danger)' : MAPPA.accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              animate={{ strokeDashoffset: CIRCUM * (1 - timerFraction) }}
              transition={{ duration: 0.3 }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <motion.span
            style={{ ...S.timerText, color: urgent ? 'var(--danger)' : 'var(--text)' }}
            animate={urgent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={urgent ? { repeat: Infinity, duration: 0.8 } : {}}
          >
            {timeLeft}
          </motion.span>
        </div>
      </motion.div>

      <div style={S.playerStrip}>
        {(players ?? []).map((p) => {
          const hasSubmitted = !!submittedPins?.[p.id]
          const isMe = p.id === localPlayerId
          return (
            <div key={p.id} style={S.playerPill}>
              <div
                style={{
                  ...S.blobCircle,
                  backgroundColor: p.color,
                  boxShadow: isMe ? `0 0 0 2.5px ${MAPPA.accent}` : 'none',
                  opacity: hasSubmitted ? 1 : 0.4,
                }}
              >
                {(p.name || '?').slice(0, 1).toUpperCase()}
              </div>
              {hasSubmitted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  style={S.checkBadge}
                >
                  ✓
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      <div style={S.mapSection}>
        <div style={S.mapCard}>
          <MapView
            onPinDrop={onPinDrop}
            pins={pins}
            disabled={confirmed || isExpired}
            rounded={false}
          />
          {(confirmed || isExpired) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={S.lockedOverlay}
            />
          )}
        </div>
      </div>

      <div style={S.footer}>
        <AnimatePresence mode="wait">
          {confirmed && (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ ...S.statusText, color: 'var(--success)' }}
            >
              Risposta bloccata! 🔒
            </motion.p>
          )}
          {!confirmed && isExpired && (
            <motion.p
              key="timeout"
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              style={{ ...S.statusText, color: 'var(--danger)' }}
            >
              Tempo scaduto! ⏰
            </motion.p>
          )}
          {!confirmed && !isExpired && !localPin && (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ ...S.statusText, color: 'var(--muted)' }}
            >
              Tocca la mappa per piazzare il pin 📍
            </motion.p>
          )}
          {!confirmed && !isExpired && localPin && (
            <motion.p
              key="ready"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ ...S.statusText, color: MAPPA.accent }}
            >
              Pin posizionato — conferma!
            </motion.p>
          )}
        </AnimatePresence>

        <Button
          variant="primary"
          width="full"
          disabled={!canConfirm}
          onClick={onConfirm}
          style={canConfirm ? accentBtnStyle('mappa') : undefined}
        >
          {confirmed ? '✅ Confermato' : 'Conferma 📍'}
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
    position: 'relative',
    height: '100dvh',
  },
  questionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(14px, 3vw, 20px)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  questionEmoji: {
    fontSize: 'clamp(16px, 2.2dvh, 22px)',
    flexShrink: 0,
  },
  questionText: {
    margin: 0,
    fontWeight: 800,
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    lineHeight: 1.3,
    color: 'var(--text)',
    flex: 1,
  },
  timerRing: {
    position: 'relative',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerText: {
    position: 'absolute',
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  playerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(12px, 2.5vw, 20px)',
    padding: 'clamp(6px, 0.8dvh, 10px) clamp(14px, 3vw, 20px)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  playerPill: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobCircle: {
    width: 'clamp(30px, 5vw, 38px)',
    height: 'clamp(30px, 5vw, 38px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(12px, 1.5dvh, 15px)',
    fontWeight: 700,
    color: '#fff',
    transition: 'opacity 0.3s, box-shadow 0.3s',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: GAME_COLORS.mappa.accent,
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--surface)',
  },
  mapSection: {
    flex: 1,
    minHeight: 0,
    padding: 'clamp(6px, 1dvh, 10px) clamp(10px, 2vw, 16px)',
    display: 'flex',
  },
  mapCard: {
    flex: 1,
    borderRadius: 16,
    border: '1.5px solid var(--border)',
    overflow: 'hidden',
    position: 'relative',
  },
  lockedOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.15)',
    zIndex: 10,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  },
  footer: {
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(14px, 3vw, 20px)',
    paddingBottom: 'clamp(12px, 2dvh, 20px)',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
  statusText: {
    margin: 0,
    fontSize: 'clamp(12px, 1.5dvh, 15px)',
    textAlign: 'center',
    fontWeight: 700,
  },
}

export default MappaQuestion
