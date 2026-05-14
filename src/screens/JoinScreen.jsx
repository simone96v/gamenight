import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import { addPlayerToRoom, getRoom } from '../lib/room'
import { useSession } from '../stores/useSession'
import { AVATAR_COLORS } from '../utils/colors'

const CODE_ALPHABET = 'BCDFGHJKLMNPRSTVWX'

const ColorPicker = ({ colors, takenColors, selected, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    style={cardStyle}
  >
    <div style={labelStyle}>🎨 Scegli il tuo colore</div>
    <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', justifyContent: 'center', flexWrap: 'wrap' }}>
      {colors.map((c) => {
        const taken = takenColors.includes(c)
        const active = selected === c
        return (
          <motion.button
            key={c}
            type="button"
            whileHover={!taken ? { scale: 1.15, boxShadow: `0 0 0 3px ${c}40, 0 4px 14px ${c}50` } : {}}
            whileTap={!taken ? { scale: 0.85 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => !taken && onSelect(c)}
            disabled={taken}
            style={{
              width: 'clamp(36px, 5vw, 44px)',
              height: 'clamp(36px, 5vw, 44px)',
              borderRadius: '50%',
              background: c,
              border: active ? '3px solid var(--text)' : '3px solid transparent',
              boxShadow: active ? `0 0 0 3px ${c}50, 0 4px 12px ${c}40` : `0 2px 8px ${c}30`,
              opacity: taken ? 0.2 : 1,
              cursor: taken ? 'not-allowed' : 'pointer',
              outline: 'none',
              position: 'relative',
            }}
          >
            {taken && (
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>✕</span>
            )}
          </motion.button>
        )
      })}
    </div>
  </motion.div>
)

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
          gap: 'clamp(12px, 1.8dvh, 18px)',
          paddingTop: 'clamp(16px, 3dvh, 32px)',
          paddingBottom: 'clamp(16px, 3dvh, 28px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', flexShrink: 0 }}
        >
          <GradientTitle as="h1" size="lg">Entra nel party</GradientTitle>
          <p style={{
            margin: '6px 0 0',
            color: 'var(--muted)',
            fontSize: 'clamp(12px, 1.5dvh, 14px)',
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
            style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontWeight: 800, fontSize: 'clamp(20px, 3dvh, 28px)' }}
            autoFocus
            maxLength={4}
          />
        </motion.div>

        {/* Color picker — shown when code is 4 chars */}
        {code.length === 4 && (
          <ColorPicker
            colors={AVATAR_COLORS}
            takenColors={takenColors}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />
        )}

        {/* Name input */}
        {code.length === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            style={cardStyle}
          >
            <div style={labelStyle}>✍️ Il tuo nome</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Marco"
                style={inputStyle}
                maxLength={12}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                style={{ flexShrink: 0, padding: '0 16px', boxShadow: 'none', height: 'clamp(44px, 6dvh, 56px)' }}
              >
                {submitting ? '...' : 'Entra'}
              </Button>
            </div>
          </motion.div>
        )}
      </form>

      {/* Bottom blob — gray until color is picked */}
      <Blob
        color={selectedColor}
        expr={blobExpr}
        id="join-blob"
        size="clamp(200px, 48vw, 300px)"
        animate={false}
        style={{
          bottom: 'clamp(-90px, -14dvh, -55px)',
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
  padding: 'clamp(12px, 1.8dvh, 16px)',
  boxShadow: 'var(--shadow-sm)',
  flexShrink: 0,
}

const labelStyle = {
  fontSize: 'clamp(11px, 1.4dvh, 13px)',
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const inputStyle = {
  flex: 1,
  minWidth: 0,
  height: 'clamp(44px, 6dvh, 56px)',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 'clamp(14px, 2dvh, 18px)',
  padding: '0 clamp(12px, 2vw, 16px)',
  outline: 'none',
}

export default JoinScreen
