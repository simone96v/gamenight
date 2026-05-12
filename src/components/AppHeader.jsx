// Header presente in ogni schermata. Renderizza direttamente l'elemento <header class="screen-header">,
// quindi le screen non devono wrapparlo: basta metterlo come primo figlio di .screen.
// Layout (gestito da .screen-header in index.css: flex row, space-between, padding fluido):
//   [🎮 GameNight]                              [ConnectionBadge (solo se mode==='online')]
//
// `connectionStatus` arriva da useRoomSync (montato in App.jsx) e viene passato giù.

import { useContext } from 'react'
import ConnectionBadge from './ConnectionBadge'
import { useSession } from '../stores/useSession'
import { ConnectionContext } from '../contexts/connection'

const AppHeader = ({ connectionStatus }) => {
  const ctxStatus = useContext(ConnectionContext)
  const mode = useSession((s) => s.mode)
  const status = connectionStatus ?? ctxStatus
  return (
    <header className="screen-header">
      <div
        className="font-bold flex items-center"
        style={{
          color: 'var(--text)',
          fontSize: 'clamp(18px, 3dvh, 24px)',
          gap: '8px',
          letterSpacing: '-0.01em',
        }}
      >
        <span aria-hidden="true">🎮</span>
        <span>GameNight</span>
      </div>
      {mode === 'online' && <ConnectionBadge status={status} />}
    </header>
  )
}

export default AppHeader
