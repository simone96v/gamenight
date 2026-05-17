// Fase finale di Emoji Quiz: podio top-3 con blob + corona + leaderboard completa.
// Layout speculare a Trivia/FinalPhase per coerenza visiva.

import { motion } from 'framer-motion'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import GameSection from '../../../components/ui/GameSection'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const Crown = ({ size = 32 }) => (
  <svg viewBox="0 0 100 80" width={size} height={size * 0.8} style={{ display: 'block' }}>
    <polygon
      points="10,60 20,25 35,45 50,10 65,45 80,25 90,60"
      fill="#FBBF24" stroke="#F59E0B" strokeWidth="3" strokeLinejoin="round"
    />
    <rect x="10" y="58" width="80" height="12" rx="4" fill="#FBBF24" stroke="#F59E0B" strokeWidth="3" />
    <circle cx="50" cy="10" r="5" fill="#FDE68A" />
    <circle cx="20" cy="25" r="4" fill="#FDE68A" />
    <circle cx="80" cy="25" r="4" fill="#FDE68A" />
  </svg>
)

const PodiumBlob = ({ player, rank, expr, blobSize, delay }) => {
  const isFirst = rank === 0
  const rankColors = ['#FBBF24', '#C0C0C0', '#CD7F32']
  const rankLabels = ['1st', '2nd', '3rd']
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: isFirst ? 6 : 4,
        flex: 1,
        maxWidth: isFirst ? 130 : 110,
      }}
    >
      <div style={{ height: isFirst ? 28 : 0, display: 'flex', alignItems: 'flex-end' }}>
        {isFirst && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.3, type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Crown size={32} />
          </motion.div>
        )}
      </div>
      <motion.div
        animate={isFirst ? { scale: [1, 1.06, 1] } : {}}
        transition={isFirst ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : {}}
      >
        <MiniBlob color={player.color} expr={expr} size={blobSize} id={`eq-podium-${rank}`} />
      </motion.div>
      <span style={{
        fontSize: isFirst ? 'clamp(13px, 1.6dvh, 16px)' : 'clamp(11px, 1.3dvh, 13px)',
        fontWeight: 700, color: 'var(--text)',
        maxWidth: isFirst ? 110 : 90,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>{player.name}</span>
      <div style={{
        background: `linear-gradient(135deg, ${rankColors[rank]}22, ${rankColors[rank]}11)`,
        border: `1.5px solid ${rankColors[rank]}55`,
        borderRadius: 'var(--radius-sm)',
        padding: isFirst
          ? 'clamp(8px, 1.2dvh, 12px) clamp(16px, 3vw, 24px)'
          : 'clamp(6px, 1dvh, 10px) clamp(12px, 2.5vw, 20px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      }}>
        <span style={{
          fontSize: isFirst ? 'clamp(20px, 2.6dvh, 26px)' : 'clamp(16px, 2dvh, 20px)',
          fontWeight: 900, color: rankColors[rank], lineHeight: 1,
        }}>{player.score ?? 0}</span>
        <span style={{
          fontSize: 'clamp(9px, 1dvh, 11px)', fontWeight: 700,
          color: rankColors[rank], opacity: 0.7,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{rankLabels[rank]}</span>
      </div>
    </motion.div>
  )
}

const EmojiQuizFinalPhase = ({
  players,
  localPlayerId,
  eqScores,
  eqCorrectCount,
  totalRounds,
  // Sessione multi-round
  sessionRoundIdx = 0,
  sessionTotalRounds = 1,
  sessionHasMoreRounds = false,
  isHost,
  advancing,
  onReplay,
  onNextRound,
  onChangeGame,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()
  const enriched = (players ?? []).map((p) => ({
    ...p,
    score: eqScores?.[p.id] ?? p.score ?? 0,
    correct_count: eqCorrectCount?.[p.id] ?? 0,
  }))
  const sorted = [...enriched].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div style={containerStyle}>
      <div style={bodyStyle}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', flexShrink: 0 }}
        >
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            {sessionHasMoreRounds
              ? `Round ${sessionRoundIdx + 1}/${sessionTotalRounds}`
              : '🎬 Classifica Finale'}
          </GradientTitle>
          <p style={{
            margin: '4px 0 0',
            color: 'var(--muted)',
            fontSize: 'clamp(11px, 1.4dvh, 13px)',
            fontWeight: 600,
          }}>
            {sessionHasMoreRounds
              ? 'Punteggio cumulativo'
              : (sessionTotalRounds > 1 ? `Score cumulativo dei ${sessionTotalRounds} round` : `${totalRounds} domande`)}
          </p>
        </motion.div>

        {sorted.length >= 2 && (
          <div style={podiumStyle}>
            {[1, 0, 2].map((rank) => {
              const p = sorted[rank]
              if (!p) return <div key={rank} style={{ flex: 1 }} />
              const isFirst = rank === 0
              return (
                <PodiumBlob
                  key={p.id}
                  player={p}
                  rank={rank}
                  expr={isFirst ? 'happy' : expr}
                  blobSize={isFirst ? 64 : 48}
                  delay={rank === 0 ? 0.3 : rank === 1 ? 0.1 : 0.5}
                />
              )
            })}
          </div>
        )}

        <GameSection
          emoji="📊"
          title="Classifica"
          delay={0.3}
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div style={leaderboardStyle}>
            {sorted.map((p, i) => {
              const isLocal = p.id === localPlayerId
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  style={{
                    ...leaderRowStyle,
                    border: isLocal ? `1.5px solid ${C.accent}` : '1.5px solid transparent',
                    background: isLocal ? `${C.accent}14` : 'var(--bg)',
                  }}
                >
                  <span style={{ ...rankStyle, color: C.accent }}>#{i + 1}</span>
                  <MiniBlob color={p.color} expr={expr} size={28} id={`eq-lb-${i}`} />
                  <span style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: 'clamp(13px, 1.6dvh, 15px)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</span>
                  <span style={{
                    fontSize: 'clamp(10px, 1.2dvh, 12px)',
                    color: 'var(--muted)',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {p.correct_count ?? 0} <span style={{ opacity: 0.7 }}>corrette</span>
                  </span>
                  <span style={{
                    fontWeight: 800, color: C.accent,
                    fontSize: 'clamp(15px, 1.8dvh, 19px)',
                    minWidth: 40, textAlign: 'right', flexShrink: 0,
                  }}>{p.score ?? 0}</span>
                </motion.div>
              )
            })}
          </div>
        </GameSection>

        <div style={footerStyle}>
          {isHost ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Button variant="secondary" width="full" onClick={onChangeGame} disabled={advancing}>
                Cambia gioco
              </Button>
              <Button
                variant="primary"
                width="full"
                onClick={sessionHasMoreRounds ? onNextRound : onReplay}
                disabled={advancing}
                style={accentBtnStyle(C.accent)}
              >
                {advancing ? '...' : (sessionHasMoreRounds ? 'Prossimo round' : 'Rigioca')}
              </Button>
            </div>
          ) : (
            <p style={waitingTextStyle}>Aspettando il boss...</p>
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
  display: 'flex', flexDirection: 'column', flex: 1,
  padding: 'clamp(12px, 2dvh, 22px) clamp(12px, 3vw, 22px)',
  gap: 'clamp(8px, 1.4dvh, 14px)',
  overflow: 'hidden',
}
const podiumStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
  gap: 'clamp(6px, 1.5vw, 14px)', flexShrink: 0,
  padding: 'clamp(2px, 0.6dvh, 8px) 0',
}
const leaderboardStyle = {
  display: 'flex', flexDirection: 'column',
  gap: 'clamp(4px, 0.7dvh, 8px)', flex: 1, minHeight: 0,
  overflow: 'auto', scrollbarWidth: 'none',
}
const leaderRowStyle = {
  display: 'flex', alignItems: 'center',
  gap: 'clamp(8px, 1.5vw, 12px)',
  padding: 'clamp(6px, 1dvh, 10px) clamp(10px, 2vw, 16px)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
}
const rankStyle = {
  fontSize: 'clamp(13px, 1.6dvh, 16px)', fontWeight: 800,
  minWidth: 28, textAlign: 'center',
}
const footerStyle = {
  flexShrink: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
}
const waitingTextStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 500, textAlign: 'center',
  padding: 'clamp(10px, 1.5dvh, 16px) 0',
}

export default EmojiQuizFinalPhase
