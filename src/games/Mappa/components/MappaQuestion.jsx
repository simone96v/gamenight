import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import MapView from './MapView'
import { accentBtnStyle } from '../../../theme/gameColors'

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
  onPinDrop,
  onConfirm,
  onExit,
}) => {
  if (!question) return null

  const canConfirm = !!localPin && !confirmed && !isExpired
  const myPlayer = players?.find((p) => p.id === localPlayerId)
  const myColor = myPlayer?.color ?? '#059669'

  const pins = localPin
    ? [{ lat: localPin.lat, lng: localPin.lng, color: myColor, id: 'me', animated: true }]
    : []

  return (
    <div style={S.container}>
      <AppHeader
        accentColor="#059669"
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} game="mappa" />}
      />

      <GameHUD
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        timeLeft={timeLeft}
        total={timerDuration}
        players={players}
        localPlayerId={localPlayerId}
        phase="question"
      />

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={S.questionBar}
      >
        <span style={S.questionEmoji}>🗺️</span>
        <p style={S.questionText}>{question.question}</p>
      </motion.div>

      <div style={S.mapWrapper}>
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
              style={{ ...S.statusText, color: 'var(--accent)' }}
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
    fontSize: 'clamp(18px, 2.5dvh, 24px)',
    flexShrink: 0,
  },
  questionText: {
    margin: 0,
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 18px)',
    lineHeight: 1.3,
    color: 'var(--text)',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
  lockedOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.15)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  footer: {
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(14px, 3vw, 20px)',
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
