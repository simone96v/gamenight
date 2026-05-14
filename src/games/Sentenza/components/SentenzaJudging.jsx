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
import { GAME_COLORS, accentBtnStyle } from '../../../theme/gameColors'

const ACCENT = GAME_COLORS.sentenza.accent

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
                  style={accentBtnStyle('sentenza')}
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
