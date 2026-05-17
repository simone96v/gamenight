// GamesScreen — votazione del gioco (multiplayer).
// Griglia 2 colonne con GameCard condivise. Header con progresso voti.

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import GameCard from '../components/GameCard'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { availableGamesFor } from '../data/games'
import { pushRoom, rpcInitGame } from '../lib/room'

const GamesScreen = () => {
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const currentPhase = useSession((s) => s.currentPhase)
  const castVote = useSession((s) => s.castVote)
  const showError = useSession((s) => s.showError)
  const theme = useSettings((s) => s.theme)
  const expr = useMiniExpr()

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
      const basePlayers = (session.players || []).map((p) => ({ ...p, score: 0 }))
      const baseState = {
        players: basePlayers,
        currentIdx: 0,
        round: 0,
        activeGame: winnerId,
        selectedGame: winnerId,
        selectedCategory: session.gameState?.selectedCategory ?? null,
        categoryVotes: session.gameState?.categoryVotes ?? {},
      }

      const LOBBY_PHASE = {
        trivia:    'trivia_lobby',
        mappa:     'mappa_lobby',
        blobjump:  'blobjump_lobby',
        scramble:  'scramble_lobby',
        emojiquiz: 'emojiquiz_lobby',
        sentenza:  'sentenza_lobby',
      }
      const lobbyPhase = LOBBY_PHASE[winnerId]
      if (lobbyPhase) {
        const extra = winnerId === 'sentenza'
          ? { sentenzaRounds: session.gameState?.sentenzaRounds ?? 8 }
          : {}
        const pushRes = await pushRoom(roomCode, lobbyPhase, { ...baseState, ...extra })
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
        }
        return
      }

      const phaseMap = { neverhave: 'play_neverhave' }
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
    gameVotes, roomCode, launching, showError,
  ])

  const handlePick = (game) => {
    if (launching || game.locked) return
    castVote('gameVotes', game.id)
  }

  return (
    <motion.div
      className="screen screen-narrow"
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
            <p style={subtitle}>
              {totalVotes === 0
                ? 'Tocca una card per votare'
                : myVote
                  ? totalVotes === totalPlayers
                    ? 'Tutti hanno votato!'
                    : `Hai votato · ${totalVotes}/${totalPlayers}`
                  : `${totalVotes}/${totalPlayers} hanno votato`}
            </p>
          </motion.div>

          {/* Progress strip giocatori */}
          <VoteProgressStrip
            players={players}
            gameVotes={gameVotes}
            expr={expr}
          />

          {/* Grid card */}
          <div style={grid}>
            {games.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                index={i}
                onClick={() => handlePick(g)}
                selected={myVote === g.id}
                voteCount={voteCounts[g.id] || 0}
                mode="vote"
                theme={theme}
              />
            ))}
          </div>

          {launching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={launchBanner}
            >
              ⚡ Avvio del gioco vincitore...
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const VoteProgressStrip = ({ players, gameVotes, expr }) => {
  if (!players?.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={progressStrip}
    >
      {players.map((p) => {
        const voted = !!gameVotes[p.id]
        return (
          <div key={p.id} style={voterCell}>
            <div style={{
              ...voterBlob,
              opacity: voted ? 1 : 0.45,
              filter: voted ? 'none' : 'grayscale(0.3)',
            }}>
              <MiniBlob
                color={p.color}
                expr={expr}
                size={28}
                id={`voter-${p.id}`}
              />
              {voted && (
                <div style={voterCheck} aria-label="Ha votato">
                  ✓
                </div>
              )}
            </div>
            <span style={{
              ...voterName,
              color: voted ? 'var(--text)' : 'var(--muted)',
              fontWeight: voted ? 800 : 600,
            }}>
              {p.name}
            </span>
          </div>
        )
      })}
    </motion.div>
  )
}

const subtitle = {
  margin: '6px 0 0',
  color: 'var(--muted)',
  fontSize: 'clamp(13px, 1.6dvh, 16px)',
  fontWeight: 600,
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'clamp(10px, 1.4vw, 16px)',
  flexShrink: 0,
}

const launchBanner = {
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
}

const progressStrip = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(10px, 1.5vw, 16px)',
  flexWrap: 'wrap',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  padding: 'clamp(8px, 1.2dvh, 12px) clamp(12px, 2vw, 18px)',
}

const voterCell = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 48,
}

const voterBlob = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.18s, filter 0.18s',
}

const voterCheck = {
  position: 'absolute',
  bottom: -2,
  right: -4,
  background: 'var(--success)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 900,
  width: 14,
  height: 14,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1.5px solid var(--surface)',
  lineHeight: 1,
}

const voterName = {
  fontSize: 11,
  maxWidth: 56,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'center',
}

export default GamesScreen
