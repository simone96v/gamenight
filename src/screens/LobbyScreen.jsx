// Lobby — modello "pronto democratico".
// Host: aggiunge il proprio nome, vede QR code, vede giocatori + indicatori "pronto".
// Client: vede giocatori + bottone "Pronto".
// Quando tutti i non-host sono pronti (min 1), parte il gioco automaticamente.
// L'ultimo a premere Pronto genera il deck e chiama start_game.

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import PlayerAvatar from '../components/PlayerAvatar'
import ReadyButton from '../components/ReadyButton'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { addPlayerToRoom, rpcToggleReady, rpcStartGame } from '../lib/room'
import { shuffle } from '../utils/deck'
import { getCopy } from '../data/copy'
import questionsAll from '../data/questions/trivia.json'

const NUM_QUESTIONS = 10

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
  const copy = getCopy(category)

  const isOnline = mode === 'online'

  // L'host deve aggiungere il proprio nome prima di poter fare altro
  const hostHasJoined = !isHost || (isHost && !!localPlayerId)
  const showNameInput = isHost && !localPlayerId && players.length < 8

  // Ready counts (tutti i giocatori, host incluso)
  const readyCounts = useMemo(() => {
    const ready = players.filter((p) => p.is_ready)
    return { ready: ready.length, total: players.length }
  }, [players])

  // My player
  const myPlayer = useMemo(
    () => players.find((p) => p.id === localPlayerId),
    [players, localPlayerId],
  )
  const myIsReady = myPlayer?.is_ready ?? false

  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed || players.length >= 8 || adding) return

    if (isOnline) {
      // Online: usa la RPC per aggiungere il giocatore server-side
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
      // Local: aggiungi allo store locale
      addPlayer(trimmed)
    }
    setName('')
  }

  const handleRemove = (id) => {
    if (isOnline && !isHost) return
    removePlayer(id)
  }

  // Toggle ready (tutti, host incluso)
  const handleToggleReady = useCallback(async () => {
    if (!isOnline) return
    const { data, error } = await rpcToggleReady(roomCode, localPlayerId)
    if (error) {
      console.error('[Lobby] toggleReady error:', error)
      showError('generic')
      return
    }
    // Se tutti pronti → genera deck e avvia gioco
    if (data?.action === 'start_game') {
      const filtered = questionsAll.filter((q) => q.category === category)
      const pool = filtered.length >= NUM_QUESTIONS ? filtered : questionsAll
      const shuffled = shuffle([...pool])
      const deck = shuffled.slice(0, NUM_QUESTIONS).map((q) => ({
        question: q.question,
        answers: q.answers,
        correct: q.correct,
      }))
      const { error: startErr } = await rpcStartGame(roomCode, deck)
      if (startErr) {
        console.error('[Lobby] startGame error:', startErr)
      }
    }
  }, [isOnline, isHost, roomCode, localPlayerId, category, showError])

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
            {isHost && (
              <>
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
              </>
            )}
          </div>
        )}

        {showNameInput && (
          <div className="flex" style={{ gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Il tuo nome (host)"
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
              onClick={() => isHost ? handleRemove(p.id) : undefined}
              style={{ cursor: isHost ? 'pointer' : 'default', position: 'relative' }}
            >
              <PlayerAvatar
                player={p}
                showScore={false}
                size="lg"
                dimmed={!p.is_ready}
              />
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
              {p.is_ready && (
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {isOnline && readyCounts.total > 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 'clamp(12px, 1.5dvh, 14px)', textAlign: 'center' }}>
            {readyCounts.ready}/{readyCounts.total} pronti
          </p>
        )}
      </div>

      <div className="screen-footer">
        {/* Bottone Pronto per tutti (host incluso) — visibile solo dopo aver aggiunto il nome */}
        {isOnline && hostHasJoined && (
          <ReadyButton
            isReady={myIsReady}
            onToggle={handleToggleReady}
            label="Pronto"
            disabled={players.length < 2}
          />
        )}
        {isOnline && players.length < 2 && hostHasJoined && (
          <p style={{ color: 'var(--muted)', fontSize: 'clamp(12px, 1.5dvh, 14px)', textAlign: 'center' }}>
            Servono almeno 2 giocatori
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default LobbyScreen
