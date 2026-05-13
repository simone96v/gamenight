import { motion } from 'framer-motion'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import TimerRing from './TimerRing'

const SentenzaJudgingWaiting = ({
  prompt,
  myAnswer,
  judgeName,
  timeLeft,
  total,
}) => (
  <div style={S.container}>
    <div style={S.topRow}>
      <div style={{ flex: 1 }}>
        <PromptCard text={prompt} compact />
      </div>
      <TimerRing timeLeft={timeLeft} total={total} />
    </div>

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
        style={{ fontSize: 36 }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        ⚖️
      </motion.span>
      <p style={S.title}>{judgeName} sta deliberando...</p>
      <p style={S.sub}>Chi vincerà il round?</p>
    </motion.div>
  </div>
)

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(10px, 1.5dvh, 16px)',
    flex: 1,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
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
