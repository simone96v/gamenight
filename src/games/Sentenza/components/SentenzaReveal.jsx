import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import GameSection from '../../../components/ui/GameSection'
import PromptCard from './PromptCard'
import ProofCard from './ProofCard'
import Button from '../../../components/ui/Button'
import { GAME_COLORS, accentBtnStyle } from '../../../theme/gameColors'

const ACCENT = GAME_COLORS.sentenza.accent

const SentenzaReveal = ({
  prompt,
  winnerAnswer,
  winnerName,
  winnerColor,
  otherProofs,
  currentRound,
  totalRounds,
  players,
  localPlayerId,
  isHost,
  advancing,
  hasMoreRounds = true,
  onNext,
  onExit,
}) => {
  const hasWinner = !!winnerName

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
        timeLeft={0}
        total={1}
        players={players}
        localPlayerId={localPlayerId}
        phase="reveal"
        accentColor={ACCENT}
        showTimer={false}
        scoreSuffix="⚖️"
      />

      <div style={S.body}>
        <PromptCard
          text={prompt}
          revealMode={hasWinner}
          winnerAnswer={winnerAnswer}
        />

        {hasWinner ? (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 14 }}
            style={S.verdictBox}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ ...S.avatar, backgroundColor: winnerColor }}
            >
              {initialsOf(winnerName)}
            </motion.div>
            <div>
              <p style={S.verdictLabel}>⚖️ Verdetto</p>
              <p style={S.verdictName}>Vince {winnerName}!</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ ...S.verdictBox, border: '2px solid var(--border)' }}
          >
            <span style={{ fontSize: 32 }}>🤷</span>
            <div>
              <p style={S.verdictLabel}>⚖️ Verdetto</p>
              <p style={S.verdictName}>Nessun vincitore</p>
            </div>
          </motion.div>
        )}

        {otherProofs?.length > 0 && (
          <GameSection emoji="📜" title="Le altre prove" delay={0.6}>
            <div style={S.others}>
              {otherProofs.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <ProofCard
                    index={i}
                    promptText={prompt}
                    answerText={p.answer}
                    label={p.playerName}
                    disabled
                  />
                </motion.div>
              ))}
            </div>
          </GameSection>
        )}

        <div style={S.footer}>
          {isHost ? (
            <Button
              variant="primary"
              width="full"
              onClick={onNext}
              disabled={advancing}
              style={accentBtnStyle('sentenza')}
            >
              {advancing
                ? '...'
                : hasMoreRounds
                  ? 'Prossimo round →'
                  : 'Classifica finale 🏆'}
            </Button>
          ) : (
            <p style={S.waitText}>Aspettando il prossimo round... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
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
  verdictBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '2px solid var(--success)',
    padding: 'clamp(12px, 1.8dvh, 18px) clamp(14px, 2.5vw, 20px)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: 18,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  verdictLabel: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--muted)',
    margin: 0,
  },
  verdictName: {
    fontSize: 'clamp(18px, 2.3dvh, 22px)',
    fontWeight: 800,
    color: 'var(--text)',
    margin: 0,
  },
  others: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.7dvh, 8px)',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 8,
  },
  waitText: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 500,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default SentenzaReveal
