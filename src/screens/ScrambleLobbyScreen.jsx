// Lobby Scramble — selettore "Round" (1-5) + bottone Start.
// La sessione viene persistita in gameState.scrambleSession così il client
// online vede la scelta dell'host. All'avvio l'host genera N rack via seed.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { pickRoundRacks } from '../games/Scramble/data/racks'
import { SCRAMBLE_CONSTANTS } from '../games/Scramble/useScramble'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const { TOTAL_ROUNDS, ROUND_DURATION_S } = SCRAMBLE_CONSTANTS
const MIN_ROUNDS = 1
const MAX_ROUNDS = 5
const DEFAULT_ROUNDS = TOTAL_ROUNDS
const ROUND_OPTIONS = [1, 2, 3, 4, 5]

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const ScrambleLobbyScreen = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const [launching, setLaunching] = useState(false)

  const session = gameState?.scrambleSession ?? null
  const totalRounds = session?.totalRounds ?? DEFAULT_ROUNDS

  // Init sessione lobby (solo host). Se manca o ha roundIdx > 0 (residuo
  // di una partita precedente), la resetto a default.
  const initRef = useRef(false)
  useEffect(() => {
    if (!canControl || initRef.current) return
    initRef.current = true
    const cur = gameState?.scrambleSession
    if (cur && cur.totalRounds && (cur.roundIdx ?? 0) === 0) return
    const s = useSession.getState()
    const newSession = {
      roundIdx: 0,
      totalRounds: cur?.totalRounds ?? DEFAULT_ROUNDS,
      roundDuration: ROUND_DURATION_S,
    }
    const newGameState = { ...s.gameState, scrambleSession: newSession }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canControl])

  const updateSession = useCallback((patch) => {
    if (!canControl) return
    const s = useSession.getState()
    const newSession = { ...(s.gameState?.scrambleSession ?? {}), ...patch }
    const newGameState = { ...s.gameState, scrambleSession: newSession }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
  }, [canControl])

  const handleRoundsChange = (n) =>
    updateSession({ totalRounds: clamp(n, MIN_ROUNDS, MAX_ROUNDS) })

  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)

    try {
      const s = useSession.getState()
      const rounds = clamp(
        s.gameState?.scrambleSession?.totalRounds ?? DEFAULT_ROUNDS,
        MIN_ROUNDS,
        MAX_ROUNDS,
      )
      const seed = Math.floor(Math.random() * 2147483647)
      const racks = pickRoundRacks(seed, rounds)
      const now = new Date().toISOString()

      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'scramble',
        selectedGame: 'scramble',
        scrambleSession: { roundIdx: 0, totalRounds: rounds, roundDuration: ROUND_DURATION_S },
        scrambleRacks: racks,
        scrambleWords: {},
        scrambleWordCounts: {},
        scrambleScores: {},
        scrambleRoundResults: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'scramble_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
      }

      useSession.setState({
        players: fullState.players,
        gameState: {
          scrambleSession: fullState.scrambleSession,
          scrambleRacks: fullState.scrambleRacks,
          scrambleWords: {},
          scrambleWordCounts: {},
          scrambleScores: {},
          scrambleRoundResults: {},
        },
        currentPhase: 'scramble_countdown',
        questionStartedAt: now,
        activeGame: 'scramble',
      })
      navigate('/game/scramble', { replace: true })
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [canControl, launching, showError, navigate])

  const handleBack = useCallback(() => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: s.players,
      currentIdx: s.currentIdx,
      round: s.round,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  return (
    <GameLobbyLayout
      gameName="Scramble"
      gameDescription="Sette lettere, 60 secondi a round. Tocca in ordine per comporre parole italiane."
      players={players}
      canControl={canControl}
      launching={launching}
      startLabel="Via!"
      onStart={handleStart}
      onBack={handleBack}
    >
      <LobbySegmented
        label="Round"
        options={ROUND_OPTIONS}
        value={totalRounds}
        onChange={handleRoundsChange}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
    </GameLobbyLayout>
  )
}

export default ScrambleLobbyScreen
