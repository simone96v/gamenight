// Fase question: category chip + header + HUD + question card + grid risposte + status bar.

import { AnimatePresence, motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import QuestionCard from '../components/QuestionCard'
import AnswerTile from '../components/AnswerTile'

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
        {/* Category chip */}
        {category && <CategoryChip category={category} />}

        <QuestionCard question={currentQuestion} />

        <div style={gridStyle}>
          {currentQuestion?.answers.map((ans, i) => (
            <AnswerTile
              key={i}
              index={i}
              text={ans}
              mode="answer"
              isMine={i === localAnswer}
              isLocked={hasAnswered}
              disabled={hasAnswered || isExpired || submitting}
              onClick={() => onAnswer(i)}
            />
          ))}
        </div>

        <div style={statusBarStyle}>
          <AnimatePresence mode="wait">
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

const CategoryChip = ({ category }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      flexShrink: 0,
    }}
  >
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: category.color,
      color: '#fff',
      padding: '5px 14px',
      borderRadius: 999,
      fontSize: 'clamp(12px, 1.5dvh, 14px)',
      fontWeight: 800,
      letterSpacing: '0.02em',
      boxShadow: `0 2px 10px ${category.color}44`,
    }}>
      <span style={{ fontSize: 'clamp(14px, 1.8dvh, 18px)' }}>{category.emoji}</span>
      {category.label}
    </span>
  </motion.div>
)

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

const statusBarStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: 'clamp(20px, 2.5dvh, 28px)',
  flexShrink: 0,
}

const statusTextStyle = {
  margin: 0,
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  textAlign: 'center',
  fontWeight: 700,
}

export default QuestionPhase
