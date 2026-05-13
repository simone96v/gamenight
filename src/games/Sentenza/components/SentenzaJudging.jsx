import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import TimerRing from './TimerRing'
import Button from '../../../components/ui/Button'
import { haptic } from '../../../utils/haptic'

const SentenzaJudging = ({
  prompt,
  proofs,
  timeLeft,
  total,
  onVerdict,
}) => {
  const [selectedId, setSelectedId] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleVerdict = () => {
    if (!selectedId || submitted) return
    haptic.heavy()
    setSubmitted(true)
    onVerdict?.(selectedId)
  }

  return (
    <div style={S.container}>
      <div style={S.topRow}>
        <div style={{ flex: 1 }}>
          <PromptCard text={prompt} compact />
        </div>
        <TimerRing timeLeft={timeLeft} total={total} />
      </div>

      <p style={S.instruction}>Scegli la prova migliore:</p>

      <div style={S.list}>
        {proofs.map((p, i) => (
          <ProofCard
            key={p.id}
            index={i}
            promptText={prompt}
            answerText={p.text}
            selected={selectedId === p.id}
            disabled={submitted}
            onClick={() => setSelectedId(p.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedId && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <Button variant="primary" width="full" onClick={handleVerdict}>
              Emetti la Sentenza! 👑
            </Button>
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
    gap: 'clamp(8px, 1.2dvh, 14px)',
    flex: 1,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  instruction: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 700,
    color: 'var(--muted)',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
}

export default SentenzaJudging
