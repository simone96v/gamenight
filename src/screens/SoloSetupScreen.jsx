// SoloSetupScreen — setup rapido per gioco singolo: nome + colore → via!

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import GradientTitle from '../components/ui/GradientTitle'
import ColorPicker from '../components/ColorPicker'
import AccessoryPicker from '../components/AccessoryPicker'
import { useSession } from '../stores/useSession'

const SoloSetupScreen = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedAccessory, setSelectedAccessory] = useState(null)
  const resetSession = useSession((s) => s.resetSession)

  const canStart = name.trim().length > 0 && selectedColor
  const blobExpr = selectedColor ? 'happy' : 'normal'

  const handleStart = () => {
    if (!canStart) return
    resetSession()

    const playerId =
      crypto.randomUUID?.() ??
      `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    useSession.setState({
      mode: 'local',
      isHost: true,
      localPlayerId: playerId,
      players: [{
        id: playerId,
        name: name.trim(),
        color: selectedColor,
        accessory: selectedAccessory,
        score: 0,
        skip: false,
        isHost: true,
      }],
    })

    navigate('/solo/games')
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
          handleStart()
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
            Gioca da solo
          </GradientTitle>
          <p style={subtitleStyle}>Scegli il tuo blob e inizia a giocare</p>
        </motion.div>

        <ColorPicker selected={selectedColor} onSelect={setSelectedColor} />

        <AccessoryPicker selected={selectedAccessory} onSelect={setSelectedAccessory} />

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
            autoFocus
          />
        </motion.div>

        <Button
          type="submit"
          variant="primary"
          width="full"
          disabled={!canStart}
          style={
            canStart
              ? {
                  background:
                    'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  boxShadow: '0 8px 24px rgba(6, 182, 212, 0.35)',
                }
              : undefined
          }
        >
          🎮 Scegli il gioco
        </Button>
      </form>

      <Blob
        color={selectedColor}
        expr={blobExpr}
        accessory={selectedAccessory}
        id="solo-blob"
        size="min(clamp(160px, 40vw, 260px), clamp(120px, 22dvh, 260px))"
        animate={false}
        style={{
          bottom: 'clamp(-80px, -12dvh, -45px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
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

export default SoloSetupScreen
