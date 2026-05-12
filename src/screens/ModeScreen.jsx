import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { createRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

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
    const initialState = { players: [] }
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
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div
        className="screen-body"
        style={{ justifyContent: 'center', alignItems: 'center', gap: 'clamp(10px, 1.8dvh, 16px)' }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: 'var(--muted)', fontSize: 'clamp(14px, 2dvh, 17px)', marginBottom: 8, textAlign: 'center' }}
        >
          Come vuoi giocare?
        </motion.p>

        <Button variant="primary" width="full" onClick={handleCreate} disabled={creating}>
          {creating ? <Spinner size="sm" /> : 'Crea stanza online'}
        </Button>
        <Button variant="secondary" width="full" onClick={() => navigate('/join')}>
          Unisciti con codice
        </Button>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>oppure</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Button variant="secondary" width="full" onClick={handleLocal}>
          Gioca sullo stesso dispositivo
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
