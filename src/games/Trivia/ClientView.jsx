// Vista Client (giocatore) — telefono.
// Fase question: timer + bottoni risposta
// Fase reveal: risultato personale + bottone "Pronto"
// Fase final: classifica + bottone "Pronto"

import { motion, AnimatePresence } from 'framer-motion'
import PlayerAvatar from '../../components/PlayerAvatar'
import ReadyButton from '../../components/ReadyButton'

const ANSWER_COLORS = ['#7C3AED', '#0891B2', '#D97706', '#DC2626']

const ClientView = ({
  currentPhase,
  currentQuestion,
  players,
  roundResults,
  timeLeft,
  isExpired,
  questionNumber,
  totalQuestions,
  localPlayerId,
  localAnswer,
  submitting,
  myIsReady,
  myRoundResult,
  readyCounts,
  submitAnswer,
  toggleReady,
}) => {
  const hasAnswered = localAnswer !== null

  // --- QUESTION PHASE ---
  if (currentPhase === 'question') {
    return (
      <div style={S.container}>
        <div style={S.topBar}>
          <p style={S.progress}>
            Domanda {questionNumber} di {totalQuestions}
          </p>
          <TimerDisplay timeLeft={timeLeft} />
        </div>

        <h2 style={S.question}>{currentQuestion?.question}</h2>

        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => {
            const isMine = i === localAnswer
            const canClick = !hasAnswered && !isExpired && !submitting

            return (
              <motion.button
                key={i}
                whileTap={canClick ? { scale: 0.96 } : undefined}
                onClick={canClick ? () => submitAnswer(i) : undefined}
                style={{
                  ...S.answerBtn,
                  background: ANSWER_COLORS[i],
                  cursor: canClick ? 'pointer' : 'default',
                  opacity: hasAnswered ? (isMine ? 1 : 0.5) : 1,
                  border: isMine
                    ? '3px solid var(--accent)'
                    : '3px solid transparent',
                  pointerEvents: canClick ? 'auto' : 'none',
                }}
              >
                {ans}
              </motion.button>
            )
          })}
        </div>

        <div style={S.footerInfo}>
          {hasAnswered ? (
            <p style={{ ...S.muted, color: 'var(--success)' }}>Risposta inviata ✓</p>
          ) : isExpired ? (
            <p style={{ ...S.muted, color: 'var(--danger)' }}>Tempo scaduto!</p>
          ) : (
            <p style={S.muted}>Scegli la tua risposta</p>
          )}
        </div>
      </div>
    )
  }

  // --- REVEAL PHASE ---
  if (currentPhase === 'reveal') {
    const myResult = myRoundResult
    const myChosen = myResult?.chosen ?? localAnswer
    const myPoints = myResult?.points ?? 0
    const isCorrect = myResult?.correct ?? false
    const correctIdx = currentQuestion?.correct

    return (
      <div style={S.container}>
        <p style={S.progress}>
          Domanda {questionNumber} di {totalQuestions}
        </p>

        <h2 style={S.question}>{currentQuestion?.question}</h2>

        <div style={S.grid}>
          {currentQuestion?.answers.map((ans, i) => {
            const isCorrectAns = i === correctIdx
            const isMine = i === myChosen
            const bg = isCorrectAns ? 'var(--success)' : 'var(--danger)'
            const opacity = isCorrectAns || isMine ? 1 : 0.3

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0.5 }}
                animate={{ opacity, scale: isMine && isCorrectAns ? 1.03 : 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                style={{
                  ...S.answerBtn,
                  background: bg,
                  border:
                    isMine
                      ? `3px solid ${isCorrectAns ? 'var(--success)' : 'var(--danger)'}`
                      : '3px solid transparent',
                }}
              >
                {ans}
              </motion.div>
            )
          })}
        </div>

        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={S.scoreArea}
          >
            <span
              style={{
                color:
                  myPoints > 0
                    ? 'var(--success)'
                    : myPoints < 0
                      ? 'var(--danger)'
                      : 'var(--muted)',
                fontSize: 'clamp(28px, 5dvh, 40px)',
                fontWeight: 700,
              }}
            >
              {myPoints > 0 ? `+${myPoints}` : myPoints === 0 ? '0' : myPoints}
            </span>
            <span style={S.muted}>
              {myChosen == null
                ? 'Non hai risposto'
                : isCorrect
                  ? 'Risposta corretta!'
                  : 'Risposta sbagliata'}
            </span>
          </motion.div>
        </AnimatePresence>

        <div style={S.footer}>
          <ReadyButton
            isReady={myIsReady}
            onToggle={toggleReady}
            label="Pronto"
          />
          <p style={S.muted}>
            {readyCounts.ready}/{readyCounts.total} pronti
          </p>
        </div>
      </div>
    )
  }

  // --- FINAL PHASE ---
  if (currentPhase === 'final') {
    const sorted = [...players]
      .sort((a, b) => b.score - a.score)

    const myRank = sorted.findIndex((p) => p.id === localPlayerId) + 1
    const myScore = sorted.find((p) => p.id === localPlayerId)?.score ?? 0

    return (
      <div style={S.container}>
        <h2 style={{ ...S.question, fontSize: 'clamp(22px, 3.5dvh, 32px)' }}>
          Classifica Finale
        </h2>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={S.myRankArea}
        >
          <span style={{ fontSize: 'clamp(36px, 6dvh, 52px)', fontWeight: 800, color: 'var(--accent)' }}>
            #{myRank}
          </span>
          <span style={S.muted}>{myScore} punti</span>
        </motion.div>

        <div style={S.leaderboard}>
          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                ...S.leaderRow,
                border: p.id === localPlayerId ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span style={S.rank}>#{i + 1}</span>
              <PlayerAvatar player={p} showScore={false} size="sm" />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 'clamp(13px, 1.8dvh, 16px)' }}>
                {p.name}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 'clamp(16px, 2dvh, 20px)' }}>
                {p.score}
              </span>
            </motion.div>
          ))}
        </div>

        <div style={S.footer}>
          <ReadyButton
            isReady={myIsReady}
            onToggle={toggleReady}
            label="Nuova partita"
          />
          <p style={S.muted}>
            {readyCounts.ready}/{readyCounts.total} pronti
          </p>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div style={S.container}>
      <p style={S.muted}>In attesa...</p>
    </div>
  )
}

// --- Sub-components ---

const TimerDisplay = ({ timeLeft }) => {
  const urgent = timeLeft <= 5
  return (
    <motion.div
      animate={{
        scale: urgent ? [1, 1.1, 1] : 1,
        color: urgent ? 'var(--danger)' : 'var(--muted)',
      }}
      transition={urgent ? { repeat: Infinity, duration: 1 } : {}}
      style={{
        fontSize: 'clamp(20px, 3dvh, 28px)',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {timeLeft}s
    </motion.div>
  )
}

// --- Styles ---

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(12px, 2.5dvh, 24px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(8px, 1.5dvh, 16px)',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
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
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  myRankArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
    flex: 1,
    overflow: 'auto',
  },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 1.5vw, 12px)',
    padding: 'clamp(6px, 1dvh, 10px) clamp(8px, 2vw, 14px)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
  },
  rank: {
    fontSize: 'clamp(14px, 2dvh, 18px)',
    fontWeight: 800,
    color: 'var(--accent)',
    minWidth: 30,
    textAlign: 'center',
  },
}

export default ClientView
