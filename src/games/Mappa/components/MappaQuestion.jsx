import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import GameHUD from '../../../components/GameHUD'
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

  const pins = localPin
    ? [{ lat: localPin.lat, lng: localPin.lng, color: myColor, id: 'me', animated: true }]
    : []

  return (
    <div style={S.container}>
      <AppHeader
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
        accentColor={MAPPA.accent}
      />

      <div style={S.body}>
        {/* Question card — like Trivia */}
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={S.questionCard}
        >
          <h2 style={S.questionText}>{question.question}</h2>
        </motion.div>

        {/* Map card */}
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

        {/* Footer */}
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
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    padding: 'clamp(8px, 1dvh, 12px) clamp(10px, 2.5vw, 16px)',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
  questionCard: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'clamp(12px, 1.8dvh, 18px) clamp(14px, 3vw, 20px)',
  },
  questionText: {
    margin: 0,
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 18px)',
    lineHeight: 1.35,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  mapCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    border: '1.5px solid var(--border)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  lockedOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.12)',
    zIndex: 10,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.8dvh, 8px)',
  },
  statusText: {
    margin: 0,
    fontSize: 'clamp(12px, 1.5dvh, 15px)',
    textAlign: 'center',
    fontWeight: 700,
  },
}

export default MappaQuestion
