import { useNavigate } from 'react-router-dom'
import { useSession } from '../stores/useSession'
import { closeRoom } from '../lib/room'
import MiniBlob, { useMiniExpr } from './MiniBlob'

const AppHeader = ({ actions = null, leading = null }) => {
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const resetSession = useSession((s) => s.resetSession)
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const localPlayer = players.find((p) => p.id === localPlayerId)
  const blobColor = localPlayer?.color || '#8B5CF6'
  const expr = useMiniExpr()
  const accent = 'var(--text)'

  const handleLogoClick = async () => {
    if (isHost && roomCode) {
      await closeRoom(roomCode)
    }
    resetSession()
    navigate('/', { replace: true })
  }

  return (
    <header className="screen-header" style={{ position: 'relative' }}>
      <div style={slotStyle}>
        {leading || <div style={{ width: 36 }} />}
      </div>

      <button
        type="button"
        onClick={handleLogoClick}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
        aria-label="Blob Party"
      >
        <MiniBlob color={blobColor} expr={expr} size={26} id="app-header-blob" />
        <span
          style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: 'clamp(17px, 2.3dvh, 20px)',
            fontWeight: 700,
            letterSpacing: '0',
            color: accent,
            lineHeight: 1,
          }}
        >
          Blob Party
        </span>
      </button>

      <div style={{ ...slotStyle, marginLeft: 'auto' }}>
        {actions || <div style={{ width: 36 }} />}
      </div>
    </header>
  )
}

const slotStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  zIndex: 1,
}

export default AppHeader
