// GamesScreen — votazione del gioco (multiplayer).
// Layout a card verticali responsive: 1 colonna mobile, 2-3 colonne PC.

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { availableGamesFor } from '../data/games'
import { startTriviaGame } from '../lib/triviaSetup'
import { pushRoom, rpcInitGame } from '../lib/room'

const STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐']

const GamesScreen = () => {
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const currentPhase = useSession((s) => s.currentPhase)
  const castVote = useSession((s) => s.castVote)
  const showError = useSession((s) => s.showError)
  const numQuestions = useSettings((s) => s.numQuestions)
  const timerDuration = useSettings((s) => s.timerDuration)

  const [launching, setLaunching] = useState(false)

  const gameVotes = useMemo(() => gameState?.gameVotes ?? {}, [gameState?.gameVotes])
  const myVote = gameVotes[localPlayerId] ?? null
  const totalPlayers = players.length
  const totalVotes = Object.keys(gameVotes).length

  const voteCounts = useMemo(() => {
    const counts = {}
    Object.values(gameVotes).forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
    return counts
  }, [gameVotes])

  const games = useMemo(
    () => availableGamesFor({ mode: 'online', categoryId: null }),
    [],
  )

  useEffect(() => {
    if (!isHost) return
    if (currentPhase !== 'game_voting') return
    if (totalPlayers === 0 || totalVotes < totalPlayers) return
    if (launching) return

    const counts = {}
    Object.values(gameVotes).forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
    const values = Object.keys(counts)
    if (values.length === 0) return
    const max = Math.max(...Object.values(counts))
    const winners = values.filter((k) => counts[k] === max)
    const winnerId = winners[Math.floor(Math.random() * winners.length)]

    const launch = async () => {
      setLaunching(true)
      const session = useSession.getState()

      if (winnerId === 'trivia') {
        // Trivia ha una lobby dedicata (settings + wheel categorie).
        // Pulisci la session per partire da capo e naviga tutti su /trivia-lobby
        // via phase=trivia_lobby. Il game vero parte quando l'host spinna la wheel.
        const fullState = {
          players: (session.players || []).map((p) => ({ ...p, score: 0 })),
          currentIdx: 0,
          round: 0,
          activeGame: 'trivia',
          selectedGame: winnerId,
          selectedCategory: session.gameState?.selectedCategory ?? null,
          categoryVotes: session.gameState?.categoryVotes ?? {},
          // triviaSession verrà inizializzato dalla lobby stessa
        }
        const pushRes = await pushRoom(roomCode, 'trivia_lobby', fullState)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
        return
      }

      if (winnerId === 'mappa') {
        const fullState = {
          players: (session.players || []).map((p) => ({ ...p, score: 0 })),
          currentIdx: 0,
          round: 0,
          activeGame: 'mappa',
          selectedGame: winnerId,
          selectedCategory: session.gameState?.selectedCategory ?? null,
          categoryVotes: session.gameState?.categoryVotes ?? {},
        }
        const pushRes = await pushRoom(roomCode, 'mappa_lobby', fullState)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
        return
      }

      if (winnerId === 'sentenza') {
        const fullState = {
          players: (session.players || []).map((p) => ({ ...p, score: 0 })),
          currentIdx: 0,
          round: 0,
          activeGame: 'sentenza',
          selectedGame: winnerId,
          selectedCategory: session.gameState?.selectedCategory ?? null,
          categoryVotes: session.gameState?.categoryVotes ?? {},
          sentenzaRounds: session.gameState?.sentenzaRounds ?? 8,
        }
        const pushRes = await pushRoom(roomCode, 'sentenza_lobby', fullState)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
        return
      }

      const phaseMap = {
        neverhave: 'play_neverhave',
      }
      const newPhase = phaseMap[winnerId]
      if (!newPhase) {
        showError('generic')
        setLaunching(false)
        return
      }
      const { error } = await rpcInitGame(roomCode, winnerId, newPhase)
      if (error) {
        console.error('[Games] init game error:', error)
        showError('generic')
        setLaunching(false)
      }
    }
    launch()
  }, [
    isHost, currentPhase, totalPlayers, totalVotes,
    gameVotes, numQuestions, roomCode, launching, showError,
  ])

  const handlePick = (game) => {
    if (launching || game.locked) return
    castVote('gameVotes', game.id)
  }

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div
        className="screen-body"
        style={{
          gap: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          padding: 'clamp(12px, 2dvh, 24px) clamp(14px, 4vw, 48px) clamp(24px, 4dvh, 40px)',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(14px, 2dvh, 22px)',
        }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="xl">Scegli il gioco</GradientTitle>
            <p style={{
              margin: '8px 0 0',
              color: 'var(--muted)',
              fontSize: 'clamp(13px, 1.6dvh, 16px)',
              fontWeight: 600,
            }}>
              🗳️ {totalVotes}/{totalPlayers} voti
              {myVote && <span style={{ marginLeft: 8, color: 'var(--success)' }}>· ✓ Hai votato</span>}
            </p>
          </motion.div>

          {/* Grid card — 2 colonne fisse, opzionale 3+ su PC molto largo */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 'clamp(10px, 1.4vw, 16px)',
              flexShrink: 0,
            }}
          >
            {games.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                index={i}
                onClick={() => handlePick(g)}
                selected={myVote === g.id}
                voteCount={voteCounts[g.id] || 0}
              />
            ))}
          </div>

          {launching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                padding: '14px 20px',
                color: 'var(--accent)',
                fontWeight: 800,
                fontSize: 'clamp(14px, 1.8dvh, 16px)',
                flexShrink: 0,
              }}
            >
              ⚡ Avvio del gioco vincitore...
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── GameCard verticale, ricca di dettagli ──────────────────────────────────

const GameCard = ({ game, index, onClick, selected, voteCount }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 18, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
    whileHover={{
      scale: 1.03,
      y: -4,
      boxShadow: selected
        ? `0 0 0 4px rgba(0, 0, 0, 0.25), 0 24px 48px ${game.shadow}`
        : `0 16px 36px rgba(31, 41, 55, 0.14), 0 0 0 1px rgba(255,255,255,0.5) inset`,
    }}
    whileTap={{
      scale: 0.97,
      y: 0,
      boxShadow: selected
        ? `0 0 0 4px rgba(0, 0, 0, 0.20), 0 4px 12px ${game.shadow}`
        : `0 4px 10px rgba(31, 41, 55, 0.06)`,
    }}
    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    onClick={onClick}
    style={{
      width: '100%',
      background: 'var(--surface)',
      borderRadius: 20,
      border: selected ? '2.5px solid var(--accent)' : '1px solid var(--border)',
      boxShadow: selected
        ? `0 0 0 4px rgba(0, 0, 0, 0.20), 0 18px 36px ${game.shadow}`
        : `0 10px 22px rgba(31, 41, 55, 0.08), 0 0 0 1px rgba(255,255,255,0.5) inset`,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      textAlign: 'left',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Hero gradient con pattern + emoji */}
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 11',
      background: game.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Dot pattern decorativo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        backgroundPosition: '0 0',
        pointerEvents: 'none',
        opacity: 0.6,
      }} />

      {/* Orb glow */}
      <div style={{
        position: 'absolute', top: -32, right: -32, width: 130, height: 130,
        borderRadius: '50%', background: 'rgba(255,255,255,0.22)',
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -38, left: -38, width: 110, height: 110,
        borderRadius: '50%', background: 'rgba(255,255,255,0.14)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* Emoji centrale con halo */}
      <motion.div
        animate={selected
          ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.06, 1] }
          : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'relative',
          fontSize: 'clamp(46px, 9vw, 68px)',
          lineHeight: 1,
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.22))',
          zIndex: 1,
        }}
      >
        {/* Halo dietro emoji */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140%', height: '140%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0) 65%)',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
        {game.emoji}
      </motion.div>

      {/* Pill nome gioco (in basso al hero) */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        background: 'rgba(255,255,255,0.95)',
        color: 'var(--text)',
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 'clamp(10px, 1.2dvh, 12px)',
        fontWeight: 900,
        letterSpacing: '-0.005em',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(6px)',
        zIndex: 2,
        maxWidth: 'calc(100% - 16px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {game.name}
      </div>

      {/* Badge voti (top-right) */}
      {voteCount > 0 && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#111827',
            color: '#fff',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 900,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11 }}>🗳️</span>
          <span>{voteCount}</span>
        </motion.div>
      )}

      {/* Selected check (top-left) */}
      {selected && (
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#fff',
            color: 'var(--accent)',
            borderRadius: '50%',
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(0,0,0,0.20)',
            zIndex: 3,
          }}
        >
          ✓
        </motion.div>
      )}
    </div>

    {/* Body */}
    <div style={{
      padding: '10px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
    }}>
      <div style={{
        fontSize: 'clamp(10px, 1.2dvh, 12px)',
        color: 'var(--accent)',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        lineHeight: 1.2,
      }}>
        {game.tagline}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
        marginTop: 'auto',
        paddingTop: 4,
      }}>
        <span style={pillStyle}>👥 {game.minPlayers}–{game.maxPlayers}</span>
        {game.difficulty > 0 && <span style={pillStyle}>{STARS[game.difficulty]}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--accent)', opacity: 0.6 }}>→</span>
      </div>
    </div>
  </motion.button>
)

const pillStyle = {
  background: 'var(--bg2)',
  color: 'var(--accent)',
  borderRadius: 999,
  padding: '3px 9px',
  fontSize: 10,
  fontWeight: 800,
  border: '1px solid rgba(0, 0, 0, 0.14)',
  letterSpacing: '-0.005em',
}

export default GamesScreen
