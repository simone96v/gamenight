// Fase final: podio top-3 + leaderboard completa + MVP awards + footer host
// (Cambia gioco / Rigioca). Niente HUD/header: schermata celebrativa pulita.

import { motion } from 'framer-motion'
import GradientTitle from '../../../components/ui/GradientTitle'
import Button from '../../../components/ui/Button'
import PlayerAvatar from '../../../components/PlayerAvatar'
import GameSection from '../../../components/ui/GameSection'
import MvpAwards from '../components/MvpAwards'
import { PODIUM_EMOJIS } from '../constants'

const FinalPhase = ({
  players,
  localPlayerId,
  isHost,
  advancing,
  onReplay,
  onChangeGame,
  session,            // { roundIdx, totalRounds, ... } o null
}) => {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const isSessionMode = !!session && (session.totalRounds ?? 1) > 1
  const hasMoreRounds = isSessionMode && (session.roundIdx + 1) < session.totalRounds
  const roundNumber = isSessionMode ? (session.roundIdx + 1) : null

  return (
    <div style={containerStyle}>
      <div style={bodyStyle}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h2" size="lg">
            {hasMoreRounds
              ? `📊 Round ${roundNumber}/${session.totalRounds}`
              : '🏆 Classifica Finale'}
          </GradientTitle>
          {isSessionMode && !hasMoreRounds && (
            <p style={{
              margin: '6px 0 0',
              color: 'var(--muted)',
              fontSize: 'clamp(13px, 1.6dvh, 15px)',
              fontWeight: 600,
            }}>
              Score cumulativo dei {session.totalRounds} round
            </p>
          )}
        </motion.div>

        {/* Podium top 3 */}
        {sorted.length >= 2 && (
          <div style={podiumStyle}>
            {[1, 0, 2].map((rank) => {
              const p = sorted[rank]
              if (!p) return <div key={rank} style={{ flex: 1 }} />
              const isFirst = rank === 0
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rank === 0 ? 0.3 : rank === 1 ? 0.1 : 0.5 }}
                  style={{
                    ...podiumSlotStyle,
                    transform: isFirst ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: isFirst ? 32 : 24 }}>{PODIUM_EMOJIS[rank]}</span>
                  <PlayerAvatar player={p} showScore={false} size={isFirst ? 'lg' : 'md'} />
                  <span style={{
                    fontSize: 'clamp(11px, 1.4dvh, 14px)',
                    fontWeight: 700,
                    color: 'var(--text)',
                    maxWidth: 90,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 'clamp(14px, 1.8dvh, 18px)',
                    fontWeight: 800,
                    color: 'var(--accent)',
                  }}>
                    {p.score ?? 0}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        <GameSection emoji="📊" title="Classifica" delay={0.3} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={leaderboardStyle}>
            {sorted.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                style={{
                  ...leaderRowStyle,
                  border: p.id === localPlayerId ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  background: p.id === localPlayerId ? 'rgba(124, 58, 237, 0.10)' : 'var(--bg)',
                }}
              >
                <span style={rankStyle}>#{i + 1}</span>
                <div style={{ ...chipDotStyle, backgroundColor: p.color }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 'clamp(13px, 1.6dvh, 16px)' }}>
                  {p.name}
                </span>
                <span style={{
                  fontSize: 'clamp(10px, 1.2dvh, 12px)',
                  color: 'var(--muted)',
                  fontWeight: 700,
                }}>
                  {p.correct_count ?? 0}✓
                </span>
                <span style={{
                  fontWeight: 800,
                  color: 'var(--accent)',
                  fontSize: 'clamp(15px, 1.8dvh, 19px)',
                  minWidth: 40,
                  textAlign: 'right',
                }}>
                  {p.score ?? 0}
                </span>
              </motion.div>
            ))}
          </div>
        </GameSection>

        {/* MVP Awards */}
        <MvpAwards players={players} />

        {/* Footer */}
        <div style={footerStyle}>
          {isHost ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <Button variant="secondary" width="full" onClick={onChangeGame} disabled={advancing}>
                🎮 Cambia gioco
              </Button>
              <Button variant="primary" width="full" onClick={onReplay} disabled={advancing}>
                {advancing
                  ? '...'
                  : hasMoreRounds
                    ? `🎡 Prossimo round →`
                    : '🔄 Rigioca'}
              </Button>
            </div>
          ) : (
            <p style={waitingTextStyle}>Aspettando il boss... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
}

const bodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  padding: 'clamp(12px, 2dvh, 22px) clamp(12px, 3vw, 22px)',
  gap: 'clamp(8px, 1.4dvh, 14px)',
  overflow: 'hidden',
}

const podiumStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  gap: 'clamp(8px, 2vw, 16px)',
  flexShrink: 0,
  padding: 'clamp(4px, 1dvh, 12px) 0',
}

const podiumSlotStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  flex: 1,
  maxWidth: 110,
}

const leaderboardStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'clamp(4px, 0.7dvh, 8px)',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  scrollbarWidth: 'none',
}

const leaderRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(8px, 1.5vw, 12px)',
  padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2vw, 16px)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
}

const rankStyle = {
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 800,
  color: 'var(--accent)',
  minWidth: 28,
  textAlign: 'center',
}

const chipDotStyle = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  flexShrink: 0,
}

const footerStyle = {
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
}

const waitingTextStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 500,
  textAlign: 'center',
  padding: 'clamp(10px, 1.5dvh, 16px) 0',
}

export default FinalPhase
