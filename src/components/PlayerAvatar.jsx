// Cerchio colorato + iniziali + (opzionale) punteggio.
// Props:
//   player: { id, name, color, score }
//   showScore: bool (default true)
//   size: 'sm' | 'md' (default — clamp(36, 6vw, 52)) | 'lg'
//   highlighted: bool — anello --accent attorno per indicare "turno"
//   dimmed: bool — opacity ridotta (es. giocatori che non hanno ancora risposto)

const SIZE = {
  sm: { d: '32px',                       f: '12px',                       gap: 2 },
  md: { d: 'clamp(36px, 6vw, 52px)',     f: 'clamp(14px, 2dvh, 18px)',    gap: 4 },
  lg: { d: 'clamp(56px, 9vw, 80px)',     f: 'clamp(20px, 3dvh, 28px)',    gap: 6 },
}

const initialsOf = (name) => {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const PlayerAvatar = ({
  player,
  showScore = true,
  size = 'md',
  highlighted = false,
  dimmed = false,
}) => {
  if (!player) return null
  const dims = SIZE[size] ?? SIZE.md
  return (
    <div
      className="flex flex-col items-center"
      style={{
        gap: dims.gap,
        opacity: dimmed ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        className="rounded-full flex items-center justify-center text-white font-bold select-none"
        style={{
          width: dims.d,
          height: dims.d,
          backgroundColor: player.color,
          fontSize: dims.f,
          boxShadow: highlighted ? '0 0 0 3px var(--accent)' : 'none',
        }}
        aria-label={player.name}
      >
        {initialsOf(player.name)}
      </div>
      {showScore && (
        <div
          className="font-semibold"
          style={{
            color: 'var(--muted)',
            fontSize: 'clamp(12px, 1.5dvh, 14px)',
            lineHeight: 1,
          }}
        >
          {player.score ?? 0}
        </div>
      )}
    </div>
  )
}

export default PlayerAvatar
