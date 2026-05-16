import { GAME_COLORS } from '../../theme/gameColors'

const RoundBadge = ({ n, total, game = 'trivia', accentColor }) => {
  // Prefer explicit accentColor; fall back to game-based palette
  const accent = accentColor || (GAME_COLORS[game] || GAME_COLORS.trivia).accent
  const borderColor = accentColor ? `${accentColor}30` : (GAME_COLORS[game] || GAME_COLORS.trivia).badgeBorder
  return (
    <div style={{
      background: 'var(--bg2)',
      color: accent,
      fontWeight: 800,
      fontSize: 'clamp(11px, 1.4dvh, 13px)',
      padding: '5px 12px',
      borderRadius: 999,
      border: `1.5px solid ${borderColor}`,
      letterSpacing: '0.05em',
      minWidth: 44,
      textAlign: 'center',
    }}>
      {n}/{total}
    </div>
  )
}

export default RoundBadge
