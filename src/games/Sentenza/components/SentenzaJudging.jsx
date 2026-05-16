import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import Button from '../../../components/ui/Button'
import { haptic } from '../../../utils/haptic'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

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
  const C = usePlayerAccent()
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
        accentColor={C.accent}
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={currentRound} total={totalRounds} accentColor={C.accent} />}
      />
      <GameHUD
        questionNumber={currentRound}
        totalQuestions={totalRounds}
        timeLeft={timeLeft}
        total={total}
        players={players}
        localPlayerId={localPlayerId}
        phase="question"
        accentColor={C.accent}
        scoreSuffix="⚖️"
      />

      <div style={S.body}>
        <PromptCard text={prompt} compact />

        <p style={{ ...S.instruction, color: C.accent }}>👑 Tu sei il Giudice — scegli la prova migliore:</p>

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
                  style={accentBtnStyle(C.accent)}
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
