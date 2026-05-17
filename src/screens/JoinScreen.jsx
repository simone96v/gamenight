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
import { validatePlayerName } from '../utils/nameValidation'

const CODE_ALPHABET = 'BCDFGHJKLMNPRSTVWX'

const JoinScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(null)
  const [takenColors, setTakenColors] = useState([])
  const [partyNamePreview, setPartyNamePreview] = useState('')
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
      setPartyNamePreview('')
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
        setPartyNamePreview('')
        return
      }
      const players = Array.isArray(room.state?.players) ? room.state.players : []
      setTakenColors(players.map((p) => p.color))
      setPartyNamePreview(room.state?.partyName || '')
      if (selectedColor && players.some((p) => p.color === selectedColor)) {
        setSelectedColor(null)
      }
      setRoomChecked(true)
    }
    fetchRoom()
    return () => { cancelled = true }
  }, [code])

  const nameStatus = validatePlayerName(name)
  const canSubmit = code.length === 4 && nameStatus.valid && selectedColor && !submitting
  const showForm = code.length === 4
  const showNameWarning = !nameStatus.empty && !!nameStatus.reason

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

        {/* Blob preview inline — subito dopo titolo+sottotitolo */}
        <div style={blobWrapStyle}>
          <Blob
            color={selectedColor}
            expr={blobExpr}
            id="join-blob"
            size="clamp(120px, 22dvh, 180px)"
            animate={false}
            style={{ position: 'relative', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', transform: 'none' }}
          />
        </div>

        {/* Color picker — sopra gli input testuali per coerenza con le altre schermate */}
        {showForm && (
          <ColorPicker
            takenColors={takenColors}
            selected={selectedColor}
            onSelect={setSelectedColor}
          />
        )}

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
          {showForm && roomChecked && partyNamePreview && (
            <motion.p
              key={partyNamePreview}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                margin: '8px 0 0',
                textAlign: 'center',
                color: 'var(--text)',
                fontFamily: "'Baloo 2', cursive",
                fontWeight: 700,
                fontSize: 'clamp(14px, 1.8dvh, 17px)',
              }}
            >
              🎉 {partyNamePreview}
            </motion.p>
          )}
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
              style={{
                ...inputStyle,
                borderColor: showNameWarning ? 'var(--danger)' : 'var(--border)',
              }}
              maxLength={12}
              aria-invalid={showNameWarning}
            />
            {showNameWarning && (
              <p style={nameWarningStyle} role="alert">⚠ {nameStatus.reason}</p>
            )}
          </motion.div>
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
              {submitting ? '...' : 'Entra'}
            </Button>
          </motion.div>
        )}
      </form>
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

const nameWarningStyle = {
  margin: 'clamp(6px, 1dvh, 10px) 0 0',
  color: 'var(--danger)',
  fontSize: 'clamp(11px, 1.4dvh, 13px)',
  fontWeight: 700,
  lineHeight: 1.3,
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

export default JoinScreen
