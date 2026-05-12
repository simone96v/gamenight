import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'
import PlayerAvatar from '../../components/PlayerAvatar'
import TurnBanner from '../../components/TurnBanner'
import { useSession } from '../../stores/useSession'

const ANSWER_COLORS = ['#7C3AED', '#0891B2', '#D97706', '#DC2626']

const HostView = ({
  currentQuestion,
  gameState,
  players,
  myAnswer,
  hasAnswered,
  answeredCount,
  totalCount,
  allAnswered,
  canWrite,
  submitAnswer,
  startQuestion,
  revealAnswers,
  nextQuestion,
  hasMoreQuestions,
  questionNumber,
  totalQuestions,
  isOnline,
  localPlayerId,
}) => {
  const { phase, answers = {}, revealed, roundScores = {} } = gameState
  const answeredIds = new Set(Object.keys(answers))

  // Local mode: pass-the-phone — trova il prossimo giocatore che non ha risposto
  const localCurrentPlayer =
    !isOnline && phase === 'answering' && !revealed
      ? players.find((p) => !answeredIds.has(p.id))
      : null

  const setGameState = useSession((s) => s.setGameState)

  // Local mode: submit per il giocatore corrente
  const handleLocalSubmit = (idx) => {
    if (!localCurrentPlayer) return
    setGameState({
      answers: { ...answers, [localCurrentPlayer.id]: idx },
    })
  }

  // Online mode: l'host risponde come un normale giocatore tramite submitAnswer
  const handleOnlineSubmit = (idx) => {
    if (hasAnswered || revealed) return
    submitAnswer(idx)
  }

  const getPlayersByAnswer = (ansIdx) =>
    players.filter((p) => answers[p.id] === ansIdx)

  // Online: host can click to answer if not yet answered and not revealed
  const onlineCanAnswer = isOnline && phase === 'answering' && !revealed && !hasAnswered
  // Local: pass-the-phone
  const localCanAnswer = !isOnline && phase === 'answering' && !revealed && !!localCurrentPlayer

  const clickable = onlineCanAnswer || localCanAnswer

  return (
    <div style={S.container}>
      <p style={S.progress}>
        Domanda {questionNumber} di {totalQuestions}
      </p>

      {!isOnline && phase === 'answering' && !revealed && localCurrentPlayer && (
        <TurnBanner player={localCurrentPlayer} message="Tocca a" />
      )}

      <h2 style={S.question}>{currentQuestion?.question}</h2>

      <div style={S.grid}>
        {currentQuestion?.answers.map((ans, i) => {
          const isCorrect = i === currentQuestion.correct
          let bg = ANSWER_COLORS[i]
          let opacity = phase === 'waiting' ? 0.4 : 1

          // In online mode, dim non-selected after host answered
          if (isOnline && hasAnswered && !revealed) {
            const isMine = i === myAnswer
            opacity = isMine ? 1 : 0.5
          }

          if (revealed) {
            bg = isCorrect ? 'var(--success)' : 'var(--danger)'
            opacity = isCorrect ? 1 : 0.45
          }

          const votePlayers = revealed ? getPlayersByAnswer(i) : []

          return (
            <motion.button
              key={i}
              initial={false}
              animate={{ opacity, scale: 1 }}
              transition={{ delay: revealed ? i * 0.1 : 0, duration: 0.3 }}
              whileTap={clickable ? { scale: 0.96 } : undefined}
              onClick={
                clickable
                  ? () => (isOnline ? handleOnlineSubmit(i) : handleLocalSubmit(i))
                  : undefined
              }
              style={{
                ...S.answerBtn,
                background: bg,
                cursor: clickable ? 'pointer' : 'default',
                pointerEvents: clickable || revealed ? 'auto' : 'none',
                border:
                  isOnline && hasAnswered && !revealed && i === myAnswer
                    ? '3px solid var(--accent)'
                    : '3px solid transparent',
              }}
            >
              <span>{ans}</span>
              {revealed && votePlayers.length > 0 && (
                <div style={S.voterRow}>
                  {votePlayers.map((p) => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <PlayerAvatar player={p} showScore={false} size="sm" />
                      {roundScores[p.id] > 0 && (
                        <motion.span
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={S.scoreBadge}
                        >
                          +{roundScores[p.id]}
                        </motion.span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {isOnline && phase === 'answering' && !revealed && (
        <div style={S.counterArea}>
          {hasAnswered && (
            <p style={{ ...S.counter, color: 'var(--success)' }}>Risposta inviata ✓</p>
          )}
          <p style={S.counter}>
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
      )}

      {!isOnline && phase === 'answering' && !revealed && !localCurrentPlayer && (
        <p style={S.counter}>Tutti hanno risposto!</p>
      )}

      <div style={S.footer}>
        {phase === 'waiting' && (
          <Button variant="primary" width="full" onClick={startQuestion}>
            Inizia domanda
          </Button>
        )}
        {phase === 'answering' && !revealed && (
          <Button
            variant={allAnswered ? 'primary' : 'secondary'}
            width="full"
            onClick={revealAnswers}
          >
            Rivela risposte
          </Button>
        )}
        {revealed && (
          <div className="flex w-full" style={{ gap: 12 }}>
            {hasMoreQuestions ? (
              <Button variant="primary" width="full" onClick={nextQuestion}>
                Prossima domanda
              </Button>
            ) : (
              <Button variant="danger" width="full" onClick={() => nextQuestion()}>
                Fine gioco
              </Button>
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
    padding: 'clamp(12px, 2.5dvh, 24px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(8px, 1.5dvh, 14px)',
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
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
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
    gap: 6,
  },
  voterRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  scoreBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    background: 'var(--success)',
    color: 'white',
    borderRadius: 8,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  counterArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  counter: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.8dvh, 16px)',
    textAlign: 'center',
    fontWeight: 600,
    flexShrink: 0,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    gap: 12,
  },
}

export default HostView
