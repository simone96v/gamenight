// Fase reveal di LogoQuiz: LogoCard full-color + BrandRevealCard + 4 tile colorati
// (corretto verde, scelto bordo) + footer host-only.

import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import AnswerTile from '../../Trivia/components/AnswerTile'
import LogoCard from '../components/LogoCard'
import BrandRevealCard from '../components/BrandRevealCard'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const RevealPhase = ({
  round,
  questionNumber,
  totalQuestions,
  timerDuration,
  players,
  localPlayerId,
  lqAnswers,
  roundResult,
  lqScores,
  isHost,
  isOnline = true,
  hasMoreRounds,
  advancing,
  onAdvance,
  onExit,
}) => {
  const C = usePlayerAccent()
  const playersForHud = (players ?? []).map((p) => ({ ...p, score: lqScores?.[p.id] ?? 0 }))
  const myAnswer = lqAnswers?.[localPlayerId]
  const myChosen = myAnswer?.idx
  const correctIdx = round?.correct
  const myResult = roundResult?.perPlayer?.[localPlayerId]
  const myPoints = roundResult?.points?.[localPlayerId] ?? 0
  const myStreak = myResult?.streak ?? 0
  const tier = roundResult?.tier ?? round?.tier ?? 'easy'
  const tierLabel = { easy: null, medium: '×1.2 grigio', hard: '×1.5 silhouette' }[tier]

  // voters per option
  const votersByAnswer = {}
  if (lqAnswers) {
    Object.entries(lqAnswers).forEach(([pid, a]) => {
      if (!a || a.round !== roundResult?.round) return
      if (a.idx == null) return
      const p = players.find((pp) => pp.id === pid)
      if (!p) return
      if (!votersByAnswer[a.idx]) votersByAnswer[a.idx] = []
      votersByAnswer[a.idx].push(p)
    })
  }

  return (
    <div style={containerStyle}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} accentColor={C.accent} />}
      />
      <GameHUD
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        timeLeft={0}
        total={timerDuration}
        players={playersForHud}
        localPlayerId={localPlayerId}
        phase="reveal"
        accentColor={C.accent}
      />

      <div style={bodyStyle}>
        {/* In reveal: forziamo tier easy così il logo full-color è visibile (anche se il round era hard) */}
        <LogoCard logo={round?.logo} reveal />
        <BrandRevealCard brand={round?.brand} cluster={round?.cluster} />

        <div style={gridStyle}>
          {(round?.options ?? []).map((opt, i) => (
            <AnswerTile
              key={opt.id}
              index={i}
              text={opt.brand}
              mode="reveal"
              isMine={i === myChosen}
              isCorrect={i === correctIdx}
              voters={votersByAnswer[i] ?? []}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={popupWrapStyle}
        >
          <span
            style={{
              ...pointsTextStyle,
              color: myPoints > 0 ? 'var(--success)' : 'var(--muted)',
            }}
          >
            {myPoints > 0 ? `+${myPoints}` : (myChosen == null ? '🐌 Niente punti' : '😬 0 punti')}
          </span>
          {/* Riga modificatori sotto: tier (se diverso da easy) + streak (se attiva) */}
          {(tierLabel || myStreak >= 2) && (
            <span style={popupSubStyle}>
              {tierLabel && <span style={chipMutedStyle}>{tierLabel}</span>}
              {myStreak >= 2 && <span style={chipStreakStyle}>🔥 streak ×{myStreak}</span>}
            </span>
          )}
        </motion.div>

        <div style={footerStyle}>
          {isHost ? (
            <Button
              variant="primary"
              width="full"
              onClick={onAdvance}
              disabled={advancing}
              style={accentBtnStyle(C.accent)}
            >
              {advancing
                ? '…'
                : hasMoreRounds
                  ? 'Prossimo logo →'
                  : (isOnline ? 'Chi ha vinto?! 🏆' : 'Scopri il tuo risultato')}
            </Button>
          ) : (
            <p style={waitingTextStyle}>Aspettando il boss… 👑</p>
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
  gap: 'clamp(8px, 1.2dvh, 14px)',
  overflow: 'hidden',
}
const gridStyle = {
  display: 'grid', gridTemplateColumns: '1fr 1fr',
  gap: 'clamp(8px, 1.2dvh, 12px)', flexShrink: 0,
}
const footerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: 'clamp(44px, 6dvh, 52px)', flexShrink: 0,
}
const popupWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
}
const pointsTextStyle = {
  textAlign: 'center',
  fontSize: 'clamp(20px, 2.6dvh, 28px)',
  fontWeight: 800,
  letterSpacing: '0.02em',
  lineHeight: 1,
}
const popupSubStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
}
const chipMutedStyle = {
  fontSize: 'clamp(11px, 1.25dvh, 12px)',
  fontWeight: 700,
  letterSpacing: '0.02em',
  padding: '3px 9px',
  borderRadius: 999,
  background: 'var(--bg2)',
  color: 'var(--muted)',
}
const chipStreakStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  fontWeight: 800,
  letterSpacing: '0.02em',
  padding: '3px 9px',
  borderRadius: 999,
  background: 'rgba(249, 115, 22, 0.14)',
  color: '#C2410C',
}
const waitingTextStyle = {
  margin: 0,
  textAlign: 'center',
  fontSize: 'clamp(13px, 1.5dvh, 15px)',
  color: 'var(--muted)',
  fontWeight: 600,
}

export default RevealPhase
