// Lobby — modello host-controlled.
// Host: aggiunge il proprio nome, vede QR, vede giocatori, impostazioni, bottone "Inizia".
// Client: vede giocatori, messaggio "In attesa dell'host..."
// L'host avvia il gioco con il bottone "Inizia la sfida".

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import AgeModal from '../components/AgeModal'
import Button from '../components/ui/Button'
import PlayerAvatar from '../components/PlayerAvatar'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { addPlayerToRoom, rpcStartGame } from '../lib/room'
import { shuffle } from '../utils/deck'
import { getCopy } from '../data/copy'
import questionsAll from '../data/questions/trivia.json'

const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20]
const TIMER_OPTIONS = [10, 15, 20, 30]
const CATEGORY_OPTIONS = [
  { id: 'gamenight', label: '🎮 Generale' },
  { id: 'bar', label: '🍺 Bar' },
  { id: 'couple', label: '🔥 Coppia', ageWarning: true },
  { id: 'wild', label: '🌶️ Hot', ageWarning: true },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
}

const LobbyScreen = () => {
  const [name, setName] = useState('')
  const [starting, setStarting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [pendingCategory, setPendingCategory] = useState(null)
  const [showAgeModal, setShowAgeModal] = useState(false)

  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const addPlayer = useSession((s) => s.addPlayer)
  const removePlayer = useSession((s) => s.removePlayer)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)

  const category = useSettings((s) => s.category)
  const numQuestions = useSettings((s) => s.numQuestions)
  const timerDuration = useSettings((s) => s.timerDuration)
  const setNumQuestions = useSettings((s) => s.setNumQuestions)
  const setTimerDuration = useSettings((s) => s.setTimerDuration)
  const setCategory = useSettings((s) => s.setCategory)
  const ageConfirmed = useSettings((s) => s.ageConfirmed)
  const confirmAge = useSettings((s) => s.confirmAge)
  const copy = getCopy(category)

  const handleCategorySelect = (opt) => {
    if (opt.ageWarning && !ageConfirmed) {
      setPendingCategory(opt)
      setShowAgeModal(true)
      return
    }
    setCategory(opt.id)
  }

  const handleAgeConfirm = () => {
    confirmAge()
    setShowAgeModal(false)
    if (pendingCategory) {
      setCategory(pendingCategory.id)
      setPendingCategory(null)
    }
  }

  const isOnline = mode === 'online'
  const hostHasJoined = !isHost || (isHost && !!localPlayerId)
  const showNameInput = isHost && !localPlayerId && players.length < 8
  const canStart = isHost && hostHasJoined && players.length >= 2

  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed || players.length >= 8 || adding) return

    if (isOnline) {
      setAdding(true)
      const playerId =
        crypto.randomUUID?.() ??
        `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const { error } = await addPlayerToRoom(roomCode, {
        id: playerId,
        name: trimmed,
        isHost: isHost && !localPlayerId,
      })
      setAdding(false)
      if (error) {
        showError('generic')
        return
      }
      if (isHost && !localPlayerId) {
        setOnlineMode(roomCode, true, playerId)
      }
    } else {
      addPlayer(trimmed)
    }
    setName('')
  }

  const handleRemove = (id) => {
    if (isOnline && !isHost) return
    removePlayer(id)
  }

  // Host starts the game: generate deck → call start_game RPC (→ countdown phase)
  const handleStartGame = useCallback(async () => {
    if (!canStart || starting) return
    setStarting(true)

    // Usa le domande della categoria se ce ne sono abbastanza (≥ 2× numQuestions),
    // altrimenti usa l'intero pool per massima varietà.
    // Double-shuffle per maggiore entropia.
    const filtered = questionsAll.filter((q) => q.category === category)
    const pool = filtered.length >= numQuestions * 2 ? filtered : questionsAll
    const shuffled = shuffle(shuffle([...pool]))
    const deck = shuffled.slice(0, numQuestions).map((q) => ({
      question: q.question,
      answers: q.answers,
      correct: q.correct,
    }))

    const { error } = await rpcStartGame(roomCode, deck)
    if (error) {
      console.error('[Lobby] startGame error:', error)
      showError('generic')
    }
    setStarting(false)
  }, [canStart, starting, category, numQuestions, roomCode, showError])

  const joinUrl = isOnline
    ? `${window.location.origin}/join?code=${roomCode}`
    : null

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div className="screen-body" style={{ gap: 'clamp(10px, 1.8dvh, 18px)' }}>
        <h2
          className="font-bold text-center"
          style={{ fontSize: 'clamp(18px, 3dvh, 26px)', letterSpacing: '-0.01em' }}
        >
          {copy.lobbyTitle}
        </h2>

        {/* Room code + QR */}
        {isOnline && roomCode && (
          <div className="flex flex-col items-center" style={{ gap: 'clamp(6px, 1dvh, 12px)' }}>
            <div
              className="font-bold"
              style={{
                fontSize: 'clamp(28px, 5dvh, 42px)',
                letterSpacing: '0.15em',
                color: 'var(--accent)',
              }}
            >
              {roomCode}
            </div>
            {isHost && (
              <>
                <QRCodeSVG
                  value={joinUrl}
                  size={100}
                  bgColor="transparent"
                  fgColor="#F1F5F9"
                  level="L"
                />
                <p style={{ color: 'var(--muted)', fontSize: 'clamp(11px, 1.3dvh, 13px)' }}>
                  Scansiona o condividi il codice
                </p>
              </>
            )}
          </div>
        )}

        {/* Host name input */}
        {showNameInput && (
          <div className="flex" style={{ gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Il tuo nome"
              style={inputStyle}
              maxLength={20}
              autoFocus
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

        {/* Players grid */}
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
              onClick={() => (isHost ? handleRemove(p.id) : undefined)}
              style={{ cursor: isHost ? 'pointer' : 'default', position: 'relative' }}
            >
              <PlayerAvatar player={p} showScore={false} size="lg" />
              <div
                className="text-center font-medium"
                style={{
                  fontSize: 'clamp(11px, 1.4dvh, 14px)',
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
              {p.is_host && (
                <div style={hostBadgeStyle}>HOST</div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Settings (host only) */}
        {isHost && hostHasJoined && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setShowSettings((v) => !v)}
              style={linkBtnStyle}
            >
              {showSettings ? 'Nascondi impostazioni' : 'Impostazioni'}
            </button>

            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                style={settingsBoxStyle}
              >
                <div style={settingRowStyle}>
                  <span style={settingLabelStyle}>Domande</span>
                  <div style={chipGroupStyle}>
                    {NUM_QUESTIONS_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(n)}
                        style={{
                          ...chipStyle,
                          ...(numQuestions === n ? chipActiveStyle : {}),
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={settingRowStyle}>
                  <span style={settingLabelStyle}>Timer (sec)</span>
                  <div style={chipGroupStyle}>
                    {TIMER_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimerDuration(t)}
                        style={{
                          ...chipStyle,
                          ...(timerDuration === t ? chipActiveStyle : {}),
                        }}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ ...settingRowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <span style={settingLabelStyle}>Categoria</span>
                  <div style={{ ...chipGroupStyle, flexWrap: 'wrap' }}>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleCategorySelect(opt)}
                        style={{
                          ...chipStyle,
                          ...(category === opt.id ? chipActiveStyle : {}),
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Instructions */}
        <button
          onClick={() => setShowInstructions((v) => !v)}
          style={linkBtnStyle}
        >
          {showInstructions ? 'Chiudi' : 'Come si gioca?'}
        </button>

        {showInstructions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={instructionsBoxStyle}
          >
            <p>Rispondi alle domande entro il tempo limite.</p>
            <p><strong>+10</strong> risposta corretta | <strong>-10</strong> sbagliata | <strong>-5</strong> tempo scaduto</p>
            <p>L'host controlla il ritmo: avanza alle domande successive.</p>
            <p>Alla fine, vince chi ha il punteggio piu alto!</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="screen-footer" style={{ flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        {isOnline && isHost && hostHasJoined && (
          <Button
            variant="primary"
            width="full"
            onClick={handleStartGame}
            disabled={!canStart || starting}
          >
            {starting ? '...' : copy.startCTA}
          </Button>
        )}

        {isOnline && !isHost && (
          <p style={waitingStyle}>In attesa dell'host...</p>
        )}

        {isOnline && isHost && players.length < 2 && hostHasJoined && (
          <p style={waitingStyle}>Servono almeno 2 giocatori</p>
        )}
      </div>

      <AgeModal
        open={showAgeModal}
        onConfirm={handleAgeConfirm}
        onCancel={() => { setShowAgeModal(false); setPendingCategory(null) }}
      />
    </motion.div>
  )
}

// --- Styles ---

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

const hostBadgeStyle = {
  position: 'absolute',
  top: -4,
  right: -4,
  background: 'var(--accent)',
  borderRadius: 6,
  padding: '1px 5px',
  fontSize: 9,
  color: 'white',
  fontWeight: 700,
}

const linkBtnStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'center',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(148,163,184,0.3)',
}

const settingsBoxStyle = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  padding: 'clamp(10px, 1.5dvh, 16px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  overflow: 'hidden',
}

const settingRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}

const settingLabelStyle = {
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  color: 'var(--muted)',
  fontWeight: 600,
  flexShrink: 0,
}

const chipGroupStyle = {
  display: 'flex',
  gap: 6,
}

const chipStyle = {
  padding: '4px 12px',
  borderRadius: 20,
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--muted)',
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const chipActiveStyle = {
  background: 'var(--accent)',
  borderColor: 'var(--accent)',
  color: 'white',
}

const instructionsBoxStyle = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  padding: 'clamp(10px, 1.5dvh, 16px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 'clamp(12px, 1.4dvh, 14px)',
  color: 'var(--muted)',
  lineHeight: 1.5,
  overflow: 'hidden',
}

const waitingStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  textAlign: 'center',
}

export default LobbyScreen
