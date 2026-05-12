import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { createRoom } from '../lib/room'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'

const ModeScreen = () => {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const resetToLocal = useSession((s) => s.resetToLocal)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)

  const handleLocal = () => {
    resetToLocal()
    navigate('/lobby')
  }

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    const initialState = {
      players: [],
      currentIdx: 0,
      round: 0,
      activeGame: null,
      settings: useSettings.getState(),
      gameState: {},
    }
    const { code, error } = await createRoom(initialState)
    if (error || !code) {
      showError('generic')
      setCreating(false)
      return
    }
    setOnlineMode(code, true, null)
    setCreating(false)
    navigate('/lobby')
  }

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div
        className="screen-body"
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <Button variant="primary" width="full" onClick={handleLocal}>
          Gioca qui
        </Button>
        <Button variant="primary" width="full" onClick={handleCreate} disabled={creating}>
          {creating ? <Spinner size="sm" /> : 'Crea stanza'}
        </Button>
        <Button variant="secondary" width="full" onClick={() => navigate('/join')}>
          Hai un codice?
        </Button>
      </div>
      <div className="screen-footer" style={{ justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            color: 'var(--muted)',
            fontSize: 'clamp(13px, 1.8dvh, 15px)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          &#8592; Indietro
        </button>
      </div>
    </motion.div>
  )
}

export default ModeScreen
