// Lobby Scramble — usa GameLobbyLayout, nessun settings (3 round fissi da 60s).
// All'avvio l'host genera 3 rack via seed e fa partire il countdown.

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { pickRoundRacks } from '../games/Scramble/data/racks'
import { SCRAMBLE_CONSTANTS } from '../games/Scramble/useScramble'

const { TOTAL_ROUNDS, ROUND_DURATION_S } = SCRAMBLE_CONSTANTS

const ScrambleLobbyScreen = () => {
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)

    try {
      const seed = Math.floor(Math.random() * 2147483647)
      const racks = pickRoundRacks(seed, TOTAL_ROUNDS)
      const now = new Date().toISOString()
      const s = useSession.getState()

      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'scramble',
        selectedGame: 'scramble',
        scrambleSession: { roundIdx: 0, totalRounds: TOTAL_ROUNDS, roundDuration: ROUND_DURATION_S },
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
      gameEmoji="🔤"
      gameName="Scramble"
      gameDescription="Sette lettere, 60 secondi. Tocca in ordine per comporre parole italiane. 3 round, punteggio cumulativo."
      players={players}
      canControl={canControl}
      launching={launching}
      startLabel="Via!"
      onStart={handleStart}
      onBack={handleBack}
    />
  )
}

export default ScrambleLobbyScreen
