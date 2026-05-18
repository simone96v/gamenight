// GameCategoryScreen — step "scegli categoria" prima della selezione gioco.
// Funziona in entrambe le modalità:
//   - mode === 'local'  → click diretto, salva selectedGameCategory in session e va a /solo/games
//   - mode === 'online' → votazione tipo GamesScreen; host fa transizione a 'game_voting' quando tutti hanno votato

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import IconButton from '../components/ui/IconButton'
import OptionCard from '../components/ui/OptionCard'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { GAME_CATEGORIES, playableCountFor } from '../data/games'
import { pushRoom } from '../lib/room'

const GameCategoryScreen = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const currentPhase = useSession((s) => s.currentPhase)
  const roomCode = useSession((s) => s.roomCode)
  const castVote = useSession((s) => s.castVote)
  const showError = useSession((s) => s.showError)
  const expr = useMiniExpr()

  const isOnline = mode === 'online'
  const [launching, setLaunching] = useState(false)

  const gcVotes = useMemo(() => gameState?.gameCategoryVotes ?? {}, [gameState?.gameCategoryVotes])
  const myVote = gcVotes[localPlayerId] ?? null
  const totalPlayers = players.length
  const totalVotes = Object.keys(gcVotes).length

  const voteCounts = useMemo(() => {
    const counts = {}
    Object.values(gcVotes).forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
    return counts
  }, [gcVotes])

  // Online host: appena tutti hanno votato, scegli vincitore e avanza a game_voting.
  useEffect(() => {
    if (!isOnline || !isHost) return
    if (currentPhase !== 'category_voting') return
    if (totalPlayers === 0 || totalVotes < totalPlayers) return
    if (launching) return

    const values = Object.keys(voteCounts)
    if (values.length === 0) return
    const max = Math.max(...Object.values(voteCounts))
    const winners = values.filter((k) => voteCounts[k] === max)
    const winner = winners[Math.floor(Math.random() * winners.length)]

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLaunching(true)
    ;(async () => {
      const s = useSession.getState()
      const fullState = {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: null,
        selectedCategory: s.gameState?.selectedCategory ?? null,
        categoryVotes: s.gameState?.categoryVotes ?? {},
        gameCategoryVotes: gcVotes,
        selectedGameCategory: winner,
        gameVotes: {},
        selectedGame: null,
      }
      const { error } = await pushRoom(roomCode, 'game_voting', fullState)
      if (error) {
        showError('generic')
        setLaunching(false)
      }
    })()
  }, [isOnline, isHost, currentPhase, totalPlayers, totalVotes, voteCounts, gcVotes, launching, roomCode, showError])

  const handlePick = useCallback((cat) => {
    if (launching) return
    if (isOnline) {
      castVote('gameCategoryVotes', cat.id)
    } else {
      useSession.setState((s) => ({
        gameState: { ...s.gameState, selectedGameCategory: cat.id, gameCategoryVotes: {} },
      }))
      navigate('/solo/games')
    }
  }, [launching, isOnline, castVote, navigate])

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader
        leading={
          !isOnline ? (
            <IconButton ariaLabel="Indietro" onClick={() => navigate('/solo', { replace: true })}>
              ←
            </IconButton>
          ) : null
        }
      />
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
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(14px, 2dvh, 22px)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="xl">Scegli la categoria</GradientTitle>
            <p style={subtitle}>
              {isOnline
                ? totalVotes === 0
                  ? 'Tocca una card per votare'
                  : myVote
                    ? totalVotes === totalPlayers
                      ? 'Tutti hanno votato!'
                      : `Hai votato · ${totalVotes}/${totalPlayers}`
                    : `${totalVotes}/${totalPlayers} hanno votato`
                : 'Scegli il tipo di gioco che vuoi fare'}
            </p>
          </motion.div>

          {isOnline && (
            <VoteProgressStrip players={players} votes={gcVotes} expr={expr} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5dvh, 14px)' }}>
            {GAME_CATEGORIES.map((cat, i) => {
              const count = playableCountFor({ mode, gameCategory: cat.id })
              const selected = isOnline && myVote === cat.id
              const voteCount = voteCounts[cat.id] || 0
              const disabled = launching || (isOnline && count === 0)
              const descText = count > 0
                ? `${cat.description} · ${count} ${count === 1 ? 'gioco' : 'giochi'}`
                : `${cat.description} · presto disponibili`
              return (
                <OptionCard
                  key={cat.id}
                  option={{
                    emoji: cat.emoji,
                    title: cat.label,
                    description: descText,
                    bg: cat.bg,
                    shadow: cat.shadow,
                  }}
                  index={i}
                  onClick={() => handlePick(cat)}
                  selected={selected}
                  badge={isOnline && voteCount > 0 ? `${voteCount}` : null}
                  disabled={disabled}
                />
              )
            })}
          </div>

          {launching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={launchBanner}
            >
              ⚡ Categoria scelta, si va ai giochi...
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const VoteProgressStrip = ({ players, votes, expr }) => {
  if (!players?.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={progressStrip}
    >
      {players.map((p) => {
        const voted = !!votes[p.id]
        return (
          <div key={p.id} style={voterCell}>
            <div style={{
              ...voterBlob,
              opacity: voted ? 1 : 0.45,
              filter: voted ? 'none' : 'grayscale(0.3)',
            }}>
              <MiniBlob color={p.color} expr={expr} size={28} id={`vc-${p.id}`} />
              {voted && (
                <div style={voterCheck} aria-label="Ha votato">✓</div>
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

export default GameCategoryScreen
