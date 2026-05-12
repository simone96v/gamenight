import { motion, AnimatePresence } from 'framer-motion'
import PlayerAvatar from '../../components/PlayerAvatar'

const ANSWER_COLORS = ['#7C3AED', '#0891B2', '#D97706', '#DC2626']

const ClientView = ({
  currentQuestion,
  gameState,
  players,
  myAnswer,
  hasAnswered,
  answeredCount,
  totalCount,
  submitAnswer,
  questionNumber,
  totalQuestions,
  localPlayerId,
}) => {
  const { phase, answers = {}, revealed, roundScores = {} } = gameState
  const answeredIds = new Set(Object.keys(answers))
  const myScore = roundScores[localPlayerId] ?? null

  const isInPlayers = players.some((p) => p.id === localPlayerId)

  if (phase === 'waiting' || !phase) {
    return (
      <div style={S.container}>
        <p style={S.progress}>
          Domanda {questionNumber} di {totalQuestions}
        </p>
        <h2 style={S.question}>{currentQuestion?.question}</h2>
        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => (
            <div key={i} style={{ ...S.answerBtn, background: ANSWER_COLORS[i], opacity: 0.4 }}>
              {ans}
            </div>
          ))}
        </div>
        <div style={S.footerInfo}>
          <p style={S.muted}>In attesa della prossima domanda...</p>
          <div className="flex" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {players.map((p) => (
              <PlayerAvatar key={p.id} player={p} showScore size="sm" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isInPlayers) {
    return (
      <div style={S.container}>
        <p style={S.progress}>
          Domanda {questionNumber} di {totalQuestions}
        </p>
        <h2 style={S.question}>{currentQuestion?.question}</h2>
        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => (
            <div key={i} style={{ ...S.answerBtn, background: ANSWER_COLORS[i], opacity: 0.4 }}>
              {ans}
            </div>
          ))}
        </div>
        <div style={S.footerInfo}>
          <p style={S.muted}>Sei entrato a partita in corso — parteciperai dalla prossima domanda</p>
        </div>
      </div>
    )
  }

  if (phase === 'answering' && !revealed && !hasAnswered) {
    return (
      <div style={S.container}>
        <p style={S.progress}>
          Domanda {questionNumber} di {totalQuestions}
        </p>
        <h2 style={S.question}>{currentQuestion?.question}</h2>
        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.96 }}
              onClick={() => submitAnswer(i)}
              style={{
                ...S.answerBtn,
                background: ANSWER_COLORS[i],
                cursor: 'pointer',
              }}
            >
              {ans}
            </motion.button>
          ))}
        </div>
        <div style={S.footerInfo}>
          <p style={S.muted}>Scegli la tua risposta</p>
        </div>
      </div>
    )
  }

  if (phase === 'answering' && !revealed && hasAnswered) {
    return (
      <div style={S.container}>
        <p style={S.progress}>
          Domanda {questionNumber} di {totalQuestions}
        </p>
        <h2 style={S.question}>{currentQuestion?.question}</h2>
        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => {
            const isMine = i === myAnswer
            return (
              <div
                key={i}
                style={{
                  ...S.answerBtn,
                  background: ANSWER_COLORS[i],
                  opacity: isMine ? 1 : 0.5,
                  border: isMine ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                {ans}
              </div>
            )
          })}
        </div>
        <div style={S.footerInfo}>
          <p style={{ ...S.muted, color: 'var(--success)' }}>Risposta inviata ✓</p>
          <p style={S.muted}>
            {answeredCount}/{totalCount} hanno risposto
          </p>
          <div className="flex" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {players.map((p) => (
              <PlayerAvatar
                key={p.id}
                player={p}
                showScore={false}
                size="sm"
                dimmed={!answeredIds.has(p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // REVEALED
  const isCorrect = myAnswer === currentQuestion?.correct

  return (
    <div style={S.container}>
      <p style={S.progress}>
        Domanda {questionNumber} di {totalQuestions}
      </p>
      <h2 style={S.question}>{currentQuestion?.question}</h2>
      <div style={S.grid}>
        {currentQuestion?.answers.map((ans, i) => {
          const isCorrectAns = i === currentQuestion.correct
          const isMine = i === myAnswer
          let bg = isCorrectAns ? 'var(--success)' : 'var(--danger)'
          let opacity = isCorrectAns || isMine ? 1 : 0.3
          let border = 'none'

          if (isMine && isCorrectAns) {
            border = '3px solid var(--success)'
          } else if (isMine && !isCorrectAns) {
            border = '3px solid var(--danger)'
          }

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0.5 }}
              animate={{ opacity, scale: isMine && isCorrectAns ? 1.03 : 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              style={{
                ...S.answerBtn,
                background: bg,
                border,
              }}
            >
              {ans}
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {myScore !== null && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={S.scoreArea}
          >
            <span
              style={{
                color: myScore > 0 ? 'var(--success)' : 'var(--danger)',
                fontSize: 'clamp(28px, 5dvh, 40px)',
                fontWeight: 700,
              }}
            >
              {myScore > 0 ? `+${myScore}` : '0'}
            </span>
            <span style={S.muted}>
              {myScore > 0 ? 'punti guadagnati' : 'Nessun punto'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(12px, 2.5dvh, 24px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(8px, 1.5dvh, 16px)',
    overflow: 'hidden',
  },
  progress: {
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    textAlign: 'center',
    flexShrink: 0,
  },
  question: {
    fontWeight: 700,
    fontSize: 'clamp(16px, 2.5dvh, 24px)',
    lineHeight: 1.3,
    textAlign: 'center',
    letterSpacing: '-0.01em',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'clamp(8px, 1.2dvh, 12px)',
    flex: 1,
    minHeight: 0,
  },
  answerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    color: 'white',
    fontWeight: 600,
    fontSize: 'clamp(13px, 1.8dvh, 17px)',
    padding: 'clamp(8px, 1.5dvh, 16px)',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  muted: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.8dvh, 16px)',
    textAlign: 'center',
  },
  footerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  scoreArea: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
}

export default ClientView
