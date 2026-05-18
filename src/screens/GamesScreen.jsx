// GamesScreen — scelta del gioco (multiplayer).
// Online: SOLO l'host può scegliere; gli altri vedono "Aspetta il boss".
// Filtra per la categoria strutturale scelta nello step precedente.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import GameCard from '../components/GameCard'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { availableGamesFor, getGameCategory } from '../data/games'
import { pushRoom, rpcInitGame } from '../lib/room'

const LOBBY_PHASE = {
  trivia:    'trivia_lobby',
  mappa:     'mappa_lobby',
  scramble:  'scramble_lobby',
  emojiquiz: 'emojiquiz_lobby',
  logoquiz:  'logoquiz_lobby',
}

const GamesScreen = () => {
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const gameState = useSession((s) => s.gameState)
  const currentPhase = useSession((s) => s.currentPhase)
  const showError = useSession((s) => s.showError)
  const theme = useSettings((s) => s.theme)

  const [launching, setLaunching] = useState(false)

  const selectedGameCategory = gameState?.selectedGameCategory ?? null
  const category = getGameCategory(selectedGameCategory)

  const games = useMemo(
    () => availableGamesFor({ mode: 'online', categoryId: null, gameCategory: selectedGameCategory }),
    [selectedGameCategory],
  )

  // Senza categoria selezionata e siamo host → riporta a category_voting.
  useEffect(() => {
    if (!isHost) return
    if (currentPhase !== 'game_voting') return
    if (selectedGameCategory) return
    ;(async () => {
      const s = useSession.getState()
      const fullState = {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: null,
        selectedCategory: s.gameState?.selectedCategory ?? null,
        categoryVotes: s.gameState?.categoryVotes ?? {},
        gameCategoryVotes: {},
        selectedGameCategory: null,
        gameVotes: {},
        selectedGame: null,
      }
      await pushRoom(roomCode, 'category_voting', fullState)
    })()
  }, [isHost, currentPhase, selectedGameCategory, roomCode])

  const handlePick = useCallback(async (game) => {
    if (launching || game.locked || !isHost) return
    setLaunching(true)

    const s = useSession.getState()
    const basePlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    const baseState = {
      players: basePlayers,
      currentIdx: 0,
      round: 0,
      activeGame: game.id,
      selectedGame: game.id,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      selectedGameCategory: s.gameState?.selectedGameCategory ?? null,
      gameCategoryVotes: s.gameState?.gameCategoryVotes ?? {},
    }

    const lobbyPhase = LOBBY_PHASE[game.id]
    if (lobbyPhase) {
      const pushRes = await pushRoom(roomCode, lobbyPhase, baseState)
      if (pushRes.error) {
        showError('generic')
        setLaunching(false)
      }
      return
    }

    const phaseMap = {
      neverhave: 'play_neverhave',
      briscola: 'briscola_playing',
      scopa: 'scopa_playing',
    }
    const newPhase = phaseMap[game.id]
    if (!newPhase) {
      showError('generic')
      setLaunching(false)
      return
    }
    const { error } = await rpcInitGame(roomCode, game.id, newPhase)
    if (error) {
      console.error('[Games] init game error:', error)
      showError('generic')
      setLaunching(false)
    }
  }, [launching, isHost, roomCode, showError])

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <GradientTitle as="h1" size="md">
              {category ? `${category.emoji} ${category.label}` : 'Scegli il gioco'}
            </GradientTitle>
            <p style={subtitle}>
              {isHost
                ? 'Tocca una card per avviare'
                : 'Aspetta che il boss scelga... 👑'}
            </p>
          </motion.div>

          <div style={grid}>
            {games.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                index={i}
                onClick={() => handlePick(g)}
                mode="solo"
                theme={theme}
                disabled={launching || !isHost}
              />
            ))}
          </div>

          {launching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={launchBanner}
            >
              ⚡ Avvio del gioco...
            </motion.div>
          )}
        </div>
      </div>
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

export default GamesScreen
