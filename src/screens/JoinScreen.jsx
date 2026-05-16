import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import ColorPicker from '../components/ColorPicker'
import { addPlayerToRoom, getRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const CODE_ALPHABET = 'BCDFGHJKLMNPRSTVWX'

const JoinScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const [takenColors, setTakenColors] = useState([])
  const [roomChecked, setRoomChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)

  const handleCodeChange = (e) => {
    const raw = e.target.value.toUpperCase().slice(0, 4)
    const filtered = [...raw].filter((c) => CODE_ALPHABET.includes(c)).join('')
    setCode(filtered)
    if (filtered.length < 4) {
      setRoomChecked(false)
      setTakenColors([])
    }
  }

  useEffect(() => {
    if (code.length !== 4) return
    let cancelled = false
    const fetchRoom = async () => {
      const { room, error } = await getRoom(code)
      if (cancelled) return
      if (error || !room) {
        setRoomChecked(true)
        setTakenColors([])
        return
      }
      const players = Array.isArray(room.state?.players) ? room.state.players : []
      setTakenColors(players.map((p) => p.color))
      if (selectedColor && players.some((p) => p.color === selectedColor)) {
        setSelectedColor(null)
      }
      setRoomChecked(true)
    }
    fetchRoom()
    return () => { cancelled = true }
  }, [code])

  const canSubmit = code.length === 4 && name.trim().length > 0 && selectedColor && !submitting
  const showForm = code.length === 4

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    const playerId =
      crypto.randomUUID?.() ??
      `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const { error } = await addPlayerToRoom(code, {
      id: playerId,
      name: name.trim(),
      color: selectedColor,
    })
    if (error) {
      const errType = error.message === 'room_full' ? 'room_full' : 'room_not_found'
      showError(errType)
      setSubmitting(false)
      return
    }
    setOnlineMode(code, false, playerId)
    navigate('/lobby')
  }

  const blobExpr = selectedColor ? 'happy' : 'normal'

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader
        leading={
          <IconButton ariaLabel="Indietro" onClick={() => navigate('/', { replace: true })}>←</IconButton>
        }
      />
      <ErrorBanner />

      <form
        className="screen-body"
        onSubmit={handleSubmit}
        style={{
          gap: 'clamp(10px, 1.6dvh, 16px)',
          paddingTop: 'clamp(12px, 2.5dvh, 24px)',
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
          <GradientTitle as="h1" size="lg">Entra nel party</GradientTitle>
          <p style={{
            margin: '4px 0 0',
            color: 'var(--muted)',
            fontSize: 'clamp(11px, 1.4dvh, 14px)',
            fontWeight: 600,
          }}>
            Inserisci il codice e scegli il tuo blob
          </p>
        </motion.div>

        {/* Code input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={cardStyle}
        >
          <div style={labelStyle}>🎟️ Codice party</div>
          <input
            value={code}
            onChange={handleCodeChange}
            placeholder="ABCD"
            style={{
              ...inputStyle,
              letterSpacing: '0.2em',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 'clamp(18px, 2.8dvh, 26px)',
            }}
            maxLength={4}
          />
        </motion.div>

        {/* Name input */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
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
        )}

        {/* Color picker */}
        {showForm && (
          <ColorPicker
            takenColors={takenColors}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />
        )}

        {/* Entra button */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{ flexShrink: 0 }}
          >
            <Button
              type="submit"
              variant="primary"
              width="full"
              disabled={!canSubmit}
            >
              {submitting ? '...' : 'Entra 🎉'}
            </Button>
          </motion.div>
        )}
      </form>

      {/* Bottom blob — gray until color is picked, hidden when form is full on short screens */}
      <Blob
        color={selectedColor}
        expr={blobExpr}
        id="join-blob"
        size="min(clamp(200px, 52vw, 320px), clamp(180px, 30dvh, 320px))"
        animate={false}
        style={{
          bottom: 'clamp(-40px, -6dvh, -20px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </motion.div>
  )
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

export default JoinScreen
