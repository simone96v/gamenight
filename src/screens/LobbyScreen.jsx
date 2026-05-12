import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import PlayerAvatar from '../components/PlayerAvatar'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { getCopy } from '../data/copy'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
}

const LobbyScreen = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const addPlayer = useSession((s) => s.addPlayer)
  const removePlayer = useSession((s) => s.removePlayer)
  const setPhase = useSession((s) => s.setPhase)
  const setOnlineMode = useSession((s) => s.setOnlineMode)

  const category = useSettings((s) => s.category)
  const copy = getCopy(category)

  const isOnline = mode === 'online'
  const canStart = players.length >= 2
  const showNameInput = players.length < 8 && (!isOnline || isHost)

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed || players.length >= 8) return
    const player = addPlayer(trimmed)
    if (player && isOnline && isHost && !localPlayerId) {
      setOnlineMode(roomCode, true, player.id)
    }
    setName('')
  }

  const handleRemove = (id) => {
    if (isOnline && !isHost) return
    removePlayer(id)
  }

  const handleStart = () => {
    setPhase('hub')
    navigate('/hub')
  }

  const joinUrl = isOnline
    ? `${window.location.origin}/join?code=${roomCode}`
    : null

  const inputStyle = {
    flex: 1,
    height: 'clamp(44px, 6dvh, 56px)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 'clamp(14px, 2dvh, 18px)',
    padding: '0 clamp(12px, 2vw, 16px)',
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
      <div className="screen-body">
        <h2
          className="font-bold text-center"
          style={{ fontSize: 'clamp(18px, 3dvh, 26px)', letterSpacing: '-0.01em' }}
        >
          {copy.lobbyTitle}
        </h2>

        {isOnline && roomCode && (
          <div
            className="flex flex-col items-center"
            style={{ gap: 'clamp(8px, 1.5dvh, 16px)' }}
          >
            <div
              className="font-bold"
              style={{
                fontSize: 'clamp(32px, 6dvh, 48px)',
                letterSpacing: '0.15em',
                color: 'var(--accent)',
              }}
            >
              {roomCode}
            </div>
            <QRCodeSVG
              value={joinUrl}
              size={120}
              bgColor="transparent"
              fgColor="#F1F5F9"
              level="L"
            />
            <p style={{ color: 'var(--muted)', fontSize: 'clamp(12px, 1.5dvh, 14px)' }}>
              Scansiona o condividi il codice
            </p>
          </div>
        )}

        {showNameInput && (
          <div className="flex" style={{ gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={isOnline ? 'Il tuo nome' : 'Nome giocatore'}
              style={inputStyle}
              maxLength={20}
            />
            <Button
              variant="secondary"
              onClick={handleAdd}
              disabled={!name.trim()}
              style={{ flexShrink: 0, width: 'clamp(44px, 6dvh, 56px)', padding: 0 }}
            >
              +
            </Button>
          </div>
        )}

        <motion.div
          className="flex flex-wrap justify-center"
          style={{ gap: 'clamp(10px, 2vw, 18px)' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {players.map((p) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              onClick={() => handleRemove(p.id)}
              style={{ cursor: !isOnline || isHost ? 'pointer' : 'default' }}
            >
              <PlayerAvatar player={p} showScore={false} size="lg" />
              <div
                className="text-center font-medium"
                style={{
                  fontSize: 'clamp(11px, 1.5dvh, 14px)',
                  color: 'var(--muted)',
                  marginTop: 2,
                  maxWidth: 'clamp(56px, 9vw, 80px)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="screen-footer">
        <Button variant="primary" width="full" onClick={handleStart} disabled={!canStart}>
          {copy.startCTA}
        </Button>
      </div>
    </motion.div>
  )
}

export default LobbyScreen
