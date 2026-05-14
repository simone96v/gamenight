import { GAME_COLORS } from '../../theme/gameColors'

const RoundBadge = ({ n, total, game = 'trivia' }) => {
  const c = GAME_COLORS[game] || GAME_COLORS.trivia
  return (
    <div style={{
      background: 'var(--bg2)',
      color: c.accent,
      fontWeight: 800,
      fontSize: 'clamp(11px, 1.4dvh, 13px)',
      padding: '5px 12px',
      borderRadius: 999,
      border: `1.5px solid ${c.badgeBorder}`,
      letterSpacing: '0.05em',
      minWidth: 44,
      textAlign: 'center',
    }}>
      {n}/{total}
    </div>
  )
}

export default RoundBadge
