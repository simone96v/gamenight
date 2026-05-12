import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import { addPlayerToRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const CODE_ALPHABET = 'BCDFGHJKLMNPRSTVWX'

const JoinScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)

  const handleCodeChange = (e) => {
    const raw = e.target.value.toUpperCase().slice(0, 4)
    const filtered = [...raw].filter((c) => CODE_ALPHABET.includes(c)).join('')
    setCode(filtered)
  }

  const canSubmit = code.length === 4 && name.trim().length > 0 && !submitting

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    const playerId =
      crypto.randomUUID?.() ??
      `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const { error } = await addPlayerToRoom(code, { id: playerId, name: name.trim() })
    if (error) {
      const errType = error.message === 'room_full' ? 'room_full' : 'room_not_found'
      showError(errType)
      setSubmitting(false)
      return
    }
    setOnlineMode(code, false, playerId)
    navigate('/waiting')
  }

  const inputStyle = {
    width: '100%',
    height: 'clamp(48px, 7dvh, 64px)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 'clamp(16px, 2.5dvh, 22px)',
    padding: '0 clamp(14px, 3vw, 20px)',
    outline: 'none',
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
      <form
        className="screen-body"
        onSubmit={handleSubmit}
        style={{ justifyContent: 'center' }}
      >
        <label style={{ color: 'var(--muted)', fontSize: 'clamp(13px, 1.8dvh, 15px)' }}>
          Codice stanza
        </label>
        <input
          value={code}
          onChange={handleCodeChange}
          placeholder="ABCD"
          style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
          autoFocus
          maxLength={4}
        />
        <label style={{ color: 'var(--muted)', fontSize: 'clamp(13px, 1.8dvh, 15px)' }}>
          Il tuo nome
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          style={inputStyle}
          maxLength={20}
        />
      </form>
      <div className="screen-footer">
        <Button variant="primary" width="full" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Entro...' : 'Entra'}
        </Button>
      </div>
    </motion.div>
  )
}

export default JoinScreen
