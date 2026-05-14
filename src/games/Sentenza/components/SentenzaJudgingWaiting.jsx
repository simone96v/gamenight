import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import JudgeBanner from './JudgeBanner'

const ACCENT = '#6366F1'

const SentenzaJudgingWaiting = ({
  prompt,
  myAnswer,
  judgeName,
  judgeColor,
  timeLeft,
  total,
  currentRound,
  totalRounds,
  players,
  localPlayerId,
  isHost,
  onExit,
}) => (
  <div style={S.container}>
    <AppHeader
      leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
      actions={<RoundBadge n={currentRound} total={totalRounds} />}
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

      <ProofCard
        index={0}
        promptText={prompt}
        answerText={myAnswer}
        label="La tua prova"
        disabled
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={S.waitingBox}
      >
        <motion.span
          style={{ fontSize: 'clamp(36px, 5dvh, 48px)' }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚖️
        </motion.span>
        <p style={S.title}>{judgeName} sta deliberando...</p>
        <p style={S.sub}>Chi vincerà il round?</p>
      </motion.div>
    </div>
  </div>
)

const RoundBadge = ({ n, total }) => (
  <div style={{
    background: 'var(--bg2)',
    color: ACCENT,
    fontWeight: 800,
    fontSize: 'clamp(11px, 1.4dvh, 13px)',
    padding: '5px 12px',
    borderRadius: 999,
    border: `1.5px solid ${ACCENT}33`,
    letterSpacing: '0.05em',
    minWidth: 44,
    textAlign: 'center',
  }}>
    {n}/{total}
  </div>
)

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
    padding: 'clamp(20px, 3dvh, 32px)',
  },
  title: {
    fontSize: 'clamp(16px, 2.1dvh, 20px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
    textAlign: 'center',
  },
  sub: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 600,
    color: 'var(--muted)',
    margin: 0,
  },
}

export default SentenzaJudgingWaiting
