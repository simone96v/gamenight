import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import ColorPicker from '../components/ColorPicker'
import { useSession } from '../stores/useSession'
import { createRoom, addPlayerToRoom } from '../lib/room'

const CreatePartyScreen = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const [creating, setCreating] = useState(false)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const resetSession = useSession((s) => s.resetSession)
  const showError = useSession((s) => s.showError)

  const canCreate = name.trim().length > 0 && selectedColor && !creating
  const blobExpr = selectedColor ? 'happy' : 'normal'

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    resetSession()

    const { code, error } = await createRoom({
      players: [],
      categoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    })
    if (error || !code) {
      showError('generic')
      setCreating(false)
      return
    }

    const playerId =
      crypto.randomUUID?.() ??
      `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const { error: addError } = await addPlayerToRoom(code, {
      id: playerId,
      name: name.trim(),
      color: selectedColor,
      isHost: true,
    })
    if (addError) {
      showError('generic')
      setCreating(false)
      return
    }

    setOnlineMode(code, true, playerId)
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
      <AppHeader
        leading={
          <IconButton ariaLabel="Indietro" onClick={() => navigate('/', { replace: true })}>
            ←
          </IconButton>
        }
      />
      <ErrorBanner />

      <form
        className="screen-body"
        onSubmit={(e) => {
          e.preventDefault()
          handleCreate()
        }}
        style={{
          gap: 'clamp(10px, 1.6dvh, 18px)',
          paddingTop: 'clamp(12px, 2.5dvh, 28px)',
          paddingBottom: 'clamp(12px, 2dvh, 20px)',
          position: 'relative',
          zIndex: 2,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', flexShrink: 0 }}
        >
          <GradientTitle as="h1" size="lg">
            Crea il tuo party
          </GradientTitle>
          <p style={subtitleStyle}>Scegli il tuo blob e dai inizio alla festa</p>
        </motion.div>

        <div style={blobWrapStyle}>
          <Blob
            color={selectedColor}
            expr={blobExpr}
            id="create-blob"
            size="clamp(120px, 22dvh, 180px)"
            animate={false}
            style={{ position: 'relative', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', transform: 'none' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={cardStyle}
        >
          <div style={labelStyle}>✍️ Il tuo nome</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Marco"
            style={inputStyle}
            maxLength={12}
          />
        </motion.div>

        <ColorPicker selected={selectedColor} onSelect={setSelectedColor} />

        <Button
          type="submit"
          variant="primary"
          width="full"
          disabled={!canCreate}
          style={
            canCreate
              ? {
                  background:
                    'linear-gradient(var(--accent), var(--accent)) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box',
                  color: 'var(--bg)',
                  border: '3px solid transparent',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                }
              : undefined
          }
        >
          {creating ? '...' : '🎉 Crea party'}
        </Button>
      </form>
    </motion.div>
  )
}

const subtitleStyle = {
  margin: '4px 0 0',
  color: 'var(--muted)',
  fontSize: 'clamp(11px, 1.4dvh, 14px)',
  fontWeight: 600,
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 'clamp(10px, 1.6dvh, 16px)',
  boxShadow: 'var(--shadow-sm)',
  flexShrink: 0,
}

const labelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 'clamp(4px, 0.8dvh, 8px)',
}

const blobWrapStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
  margin: 'clamp(4px, 1dvh, 10px) 0',
}

const inputStyle = {
  width: '100%',
  minWidth: 0,
  height: 'clamp(40px, 5.5dvh, 52px)',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 'clamp(14px, 1.8dvh, 18px)',
  padding: '0 clamp(12px, 2vw, 16px)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default CreatePartyScreen
