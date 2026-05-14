import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import Button from '../../../components/ui/Button'
import { haptic } from '../../../utils/haptic'

const ACCENT = '#6366F1'

const SentenzaJudging = ({
  prompt,
  proofs,
  timeLeft,
  total,
  currentRound,
  totalRounds,
  players,
  localPlayerId,
  isHost,
  onVerdict,
  onExit,
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
        <PromptCard text={prompt} compact />

        <p style={S.instruction}>👑 Tu sei il Giudice — scegli la prova migliore:</p>

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

        <div style={S.footer}>
          <AnimatePresence>
            {selectedId && !submitted && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <Button
                  variant="primary"
                  width="full"
                  onClick={handleVerdict}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                    boxShadow: '0 6px 18px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  Emetti la Sentenza! 👑
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

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
    gap: 'clamp(8px, 1.2dvh, 14px)',
    overflow: 'auto',
  },
  instruction: {
    fontSize: 'clamp(13px, 1.7dvh, 15px)',
    fontWeight: 800,
    color: ACCENT,
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
    paddingTop: 8,
  },
}

export default SentenzaJudging
