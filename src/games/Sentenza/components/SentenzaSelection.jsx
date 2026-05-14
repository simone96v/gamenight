import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import PromptCard from './PromptCard'
import AnswerCard from './AnswerCard'
import JudgeBanner from './JudgeBanner'
import { haptic } from '../../../utils/haptic'
import { GAME_COLORS, accentBtnStyle } from '../../../theme/gameColors'

const ACCENT = GAME_COLORS.sentenza.accent

const SentenzaSelection = ({
  prompt,
  answers,
  timeLeft,
  total,
  currentRound,
  totalRounds,
  players,
  localPlayerId,
  isHost,
  judgeName,
  judgeColor,
  onSubmit,
  onExit,
}) => {
  const [selectedId, setSelectedId] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!selectedId || submitted) return
    haptic.medium()
    setSubmitted(true)
    onSubmit?.(selectedId)
  }

  return (
    <div style={S.container}>
      <AppHeader
        accentColor="#6366F1"
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={currentRound} total={totalRounds} game="sentenza" />}
      />
      <GameHUD
        questionNumber={currentRound}
        totalQuestions={totalRounds}
        timeLeft={timeLeft}
        total={total}
        players={players}
        localPlayerId={localPlayerId}
        phase="question"
        accentColor={ACCENT}
        scoreSuffix="⚖️"
      />

      <div style={S.body}>
        <JudgeBanner judgeName={judgeName} judgeColor={judgeColor} />

        <PromptCard text={prompt} compact />

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={S.waitingBox}
          >
            <motion.span
              style={{ fontSize: 'clamp(36px, 5dvh, 48px)' }}
              animate={{ rotate: [0, -15, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ⚖️
            </motion.span>
            <p style={S.waitingTitle}>Prova presentata!</p>
            <p style={S.waitingSub}>In attesa del verdetto...</p>
          </motion.div>
        ) : (
          <>
            <div style={S.grid}>
              {answers.map((a, i) => (
                <AnswerCard
                  key={a.id}
                  index={i}
                  text={a.text}
                  selected={selectedId === a.id}
                  onClick={() => setSelectedId(a.id)}
                />
              ))}
            </div>

            <div style={S.footer}>
              <AnimatePresence>
                {selectedId && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                  >
                    <Button
                      variant="primary"
                      width="full"
                      onClick={handleSubmit}
                      style={accentBtnStyle('sentenza')}
                    >
                      Presenta la prova ⚖️
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
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
    position: 'relative',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
    gap: 'clamp(10px, 1.5dvh, 16px)',
    overflow: 'auto',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
    paddingTop: 8,
  },
  waitingBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: 24,
  },
  waitingTitle: {
    fontSize: 'clamp(18px, 2.4dvh, 22px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  waitingSub: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 600,
    color: 'var(--muted)',
    margin: 0,
  },
}

export default SentenzaSelection
