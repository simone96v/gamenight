// Strip orizzontale dei player connessi, usata in tutti i giochi sync.
// Avatar tondo + nome troncato. Il player evidenziato (highlightId) ha glow accent.

const PlayerStripCompact = ({ players = [], highlightId = null, style = {} }) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(12px, 3vw, 18px)',
    justifyContent: 'center',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(8px)',
    flexShrink: 0,
    ...style,
  }}>
    {players.map((p) => {
      const isHl = highlightId && p.id === highlightId
      return (
        <div
          key={p.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px 3px 3px',
            background: isHl ? 'var(--accent)' : 'rgba(255,255,255,0.85)',
            border: `1.5px solid ${isHl ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 20,
            boxShadow: isHl ? '0 0 0 3px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.30)' : '0 1px 3px rgba(31,41,55,0.06)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: p.color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {p.name?.slice(0, 2).toUpperCase()}
          </div>
          <span style={{
            fontSize: 'clamp(11px, 1.4dvh, 13px)',
            fontWeight: 700,
            color: isHl ? '#fff' : 'var(--text)',
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {p.name?.slice(0, 8)}
          </span>
          {p.is_host && (
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              color: isHl ? 'rgba(255,255,255,0.85)' : 'var(--accent)',
              letterSpacing: '0.05em',
            }}>
              👑
            </span>
          )}
        </div>
      )
    })}
  </div>
)

export default PlayerStripCompact
