// Fase reveal di Emoji Quiz: AppHeader + GameHUD + emoji card + card con
// la risposta giusta + chi ha indovinato (avatar list) + punti del local
// player + footer host con "Avanti" / "Classifica".

import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import EmojiQuizCard from './EmojiQuizCard'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const EmojiQuizRevealPhase = ({
  puzzle,
  roundIdx,
  totalRounds,
  timerDuration,
  players,
  localPlayerId,
  eqRoundAnswers,
  eqRoundResult,
  eqScores,
  isHost,
  hasMoreRounds,
  advancing,
  onAdvance,
  onExit,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()

  // Chi ha indovinato (ordinato per timeMs).
  const correctAnswerers = Object.entries(eqRoundAnswers ?? {})
    .filter(([, a]) => a && a.round === roundIdx)
    .map(([pid, a]) => ({ p: players.find((pp) => pp.id === pid), timeMs: a.timeMs }))
    .filter(({ p }) => p)
    .sort((a, b) => a.timeMs - b.timeMs)

  const winnerId = eqRoundResult?.winnerId
  const localPoints = eqRoundResult?.points?.[localPlayerId] ?? 0
  const localGotIt = localPoints > 0

  const playersForHud = (players ?? []).map((p) => ({ ...p, score: eqScores?.[p.id] ?? 0 }))

  return (
    <div style={containerStyle}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />}
      />
      <GameHUD
        questionNumber={roundIdx + 1}
        totalQuestions={totalRounds}
        timeLeft={0}
        total={timerDuration}
        players={playersForHud}
        localPlayerId={localPlayerId}
        phase="reveal"
        accentColor={C.accent}
      />

      <div style={bodyStyle}>
        <EmojiQuizCard puzzle={puzzle} />

        {/* Card della risposta corretta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...answerCardStyle,
            borderColor: 'var(--success)',
          }}
        >
          <span style={answerLabelStyle}>RISPOSTA</span>
          <span style={answerTitleStyle}>{puzzle?.title ?? eqRoundResult?.title}</span>
        </motion.div>

        {/* Chi ha indovinato (con avatar) */}
        {correctAnswerers.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={solversCardStyle}
          >
            <span style={solversLabelStyle}>
              Hanno indovinato ({correctAnswerers.length}/{players.length})
            </span>
            <div style={solversRowStyle}>
              {correctAnswerers.map(({ p, timeMs }, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  style={{
                    ...solverItemStyle,
                    border: p.id === winnerId ? `1.5px solid ${C.accent}` : '1.5px solid var(--border)',
                    background: p.id === winnerId ? `${C.accent}14` : 'var(--bg)',
                  }}
                >
                  {p.id === winnerId && <span style={crownStyle}>👑</span>}
                  <MiniBlob color={p.color} expr={expr} size={26} id={`eq-rev-${p.id}`} />
                  <span style={solverNameStyle}>{p.name}</span>
                  <span style={solverTimeStyle}>{(timeMs / 1000).toFixed(1)}s</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={noWinnerStyle}
          >
            😬 Nessuno l'ha presa
          </motion.div>
        )}

        {/* Score popup local */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            ...scorePopupStyle,
            background: localGotIt ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
            border: localGotIt ? '1.5px solid var(--success)' : '1.5px solid var(--border)',
          }}
        >
          <span style={{
            fontSize: 'clamp(14px, 1.7dvh, 17px)',
            fontWeight: 800,
            color: localGotIt ? 'var(--success)' : 'var(--muted)',
          }}>
            {localGotIt ? `✓ +${localPoints} punti` : 'Nessun punto'}
          </span>
        </motion.div>

        <div style={footerStyle}>
          {isHost ? (
            <Button variant="primary" width="full" onClick={onAdvance} disabled={advancing} style={accentBtnStyle(C.accent)}>
              {advancing ? '...' : hasMoreRounds ? 'Avanti tutta! →' : 'Chi ha vinto?! 🏆'}
            </Button>
          ) : (
            <p style={waitingTextStyle}>Aspettando il boss... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative',
}
const bodyStyle = {
  display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center',
  padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
  gap: 'clamp(8px, 1.2dvh, 12px)',
  overflow: 'hidden',
}
const answerCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: 'clamp(12px, 1.8dvh, 18px) clamp(14px, 3vw, 20px)',
  background: 'rgba(16, 185, 129, 0.08)',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--success)',
  boxShadow: 'var(--shadow-sm)',
  flexShrink: 0,
}
const answerLabelStyle = {
  fontSize: 'clamp(10px, 1.2dvh, 12px)',
  fontWeight: 800,
  color: 'var(--success)',
  letterSpacing: '0.1em',
}
const answerTitleStyle = {
  fontSize: 'clamp(20px, 2.6dvh, 26px)',
  fontWeight: 900,
  color: 'var(--text)',
  textAlign: 'center',
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
}
const solversCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 'clamp(10px, 1.4dvh, 14px) clamp(12px, 2.5vw, 16px)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  flexShrink: 0,
}
const solversLabelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  fontWeight: 800,
  color: 'var(--muted)',
  letterSpacing: '0.02em',
}
const solversRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
}
const solverItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px 4px 6px',
  borderRadius: 999,
  position: 'relative',
}
const crownStyle = {
  position: 'absolute',
  top: -10,
  left: -2,
  fontSize: 14,
  transform: 'rotate(-15deg)',
}
const solverNameStyle = {
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  fontWeight: 700,
  color: 'var(--text)',
  maxWidth: 80,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
const solverTimeStyle = {
  fontSize: 'clamp(10px, 1.2dvh, 12px)',
  fontWeight: 700,
  color: 'var(--muted)',
  fontVariantNumeric: 'tabular-nums',
}
const noWinnerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 'clamp(12px, 1.8dvh, 16px)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'clamp(13px, 1.6dvh, 15px)',
  fontWeight: 700,
  color: 'var(--muted)',
  flexShrink: 0,
}
const scorePopupStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 'clamp(8px, 1.2dvh, 12px) clamp(12px, 2vw, 18px)',
  borderRadius: 'var(--radius-sm)',
  flexShrink: 0,
}
const footerStyle = {
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  paddingTop: 4,
}
const waitingTextStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 500,
  textAlign: 'center',
  padding: 'clamp(10px, 1.5dvh, 16px) 0',
}

export default EmojiQuizRevealPhase
