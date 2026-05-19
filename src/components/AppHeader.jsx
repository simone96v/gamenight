import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../stores/useSession'
import { closeRoom } from '../lib/room'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import ConnectionBadge from './ConnectionBadge'
import MenuButton from './MenuButton'
import { ConnectionContext } from '../contexts/connection'

const AppHeader = ({ actions = null, leading = null }) => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const resetSession = useSession((s) => s.resetSession)
  const connStatus = useContext(ConnectionContext)
  // Mascotte ufficiale Blob Party — sempre giallo, indipendente dal colore del giocatore.
  const MASCOT_COLOR = '#F59E0B'
  const expr = useMiniExpr()
  const accent = 'var(--text)'
  const showBadge = mode === 'online' && connStatus !== 'idle'

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
        <MiniBlob color={MASCOT_COLOR} expr={expr} size={26} id="app-header-blob" />
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
        {showBadge && <ConnectionBadge status={connStatus} />}
        {actions}
        <MenuButton />
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
