// Fase question: category chip + header + HUD + question card + grid risposte + confirm button.

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import QuestionCard from '../components/QuestionCard'
import AnswerTile from '../components/AnswerTile'
import { haptic } from '../../../utils/haptic'

const spring = { type: 'spring', stiffness: 400, damping: 22 }

const QuestionPhase = ({
  currentQuestion,
  questionNumber,
  totalQuestions,
  timeLeft,
  timerDuration,
  players,
  localPlayerId,
  localAnswer,
  isExpired,
  submitting,
  isHost,
  category,
  onAnswer,
  onExit,
}) => {
  const hasAnswered = localAnswer !== null
  const [selected, setSelected] = useState(null)

  // Reset selection when question changes
  useEffect(() => {
    setSelected(null)
  }, [currentQuestion?.id ?? questionNumber])

  const handleSelect = (i) => {
    if (hasAnswered || isExpired || submitting) return
    setSelected(i)
  }

  const handleConfirm = () => {
    if (selected === null || hasAnswered || submitting) return
    haptic.heavy()
    onAnswer(selected)
  }

  return (
    <div style={containerStyle}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} game="trivia" />}
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

      <div style={bodyStyle}>
        <QuestionCard question={currentQuestion} />

        <div style={gridStyle}>
          {currentQuestion?.answers.map((ans, i) => (
            <AnswerTile
              key={i}
              index={i}
              text={ans}
              mode="answer"
              isMine={hasAnswered ? i === localAnswer : i === selected}
              isLocked={hasAnswered}
              disabled={hasAnswered || isExpired || submitting}
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>

        {/* Confirm button / status bar */}
        <div style={footerStyle}>
          <AnimatePresence mode="wait">
            {!hasAnswered && !isExpired && selected !== null && (
              <motion.button
                key="confirm"
                type="button"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={spring}
                whileHover={{ y: -2, boxShadow: '0 10px 28px rgba(0,0,0,0.25)' }}
                whileTap={{ y: 1, scale: 0.97 }}
                onClick={handleConfirm}
                disabled={submitting}
                style={confirmBtnStyle}
              >
                {submitting ? '...' : 'Conferma'}
              </motion.button>
            )}
            {hasAnswered && (
              <motion.p
                key="answered"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ ...statusTextStyle, color: 'var(--success)' }}
              >
                Bloccata! 🔒
              </motion.p>
            )}
            {!hasAnswered && isExpired && (
              <motion.p
                key="expired"
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                style={{ ...statusTextStyle, color: 'var(--danger)' }}
              >
                Troppo lento, lumaca! 🐌
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
}

const bodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  justifyContent: 'center',
  padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
  gap: 'clamp(8px, 1.2dvh, 12px)',
  overflow: 'hidden',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'clamp(8px, 1.2dvh, 12px)',
  flexShrink: 0,
}

const footerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 'clamp(40px, 6dvh, 52px)',
  flexShrink: 0,
}

const confirmBtnStyle = {
  width: '100%',
  height: 'clamp(44px, 6dvh, 52px)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--bg)',
  fontSize: 'clamp(15px, 2dvh, 18px)',
  fontWeight: 800,
  letterSpacing: '0.01em',
  cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
  transition: 'opacity 0.15s',
}

const statusTextStyle = {
  margin: 0,
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  textAlign: 'center',
  fontWeight: 700,
}

export default QuestionPhase
