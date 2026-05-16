// Scramble entry — phase router. Modello host-controlled, 3 round × 60s.
//
// Phase: scramble_countdown → scramble_playing → scramble_results
//        → ... → scramble_final.

import { lazy, Suspense, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScramble } from './useScramble'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import BlobLoader from '../../components/BlobLoader'
import SoloResultScreen from '../../components/SoloResultScreen'
import Spinner from '../../components/ui/Spinner'
import { pickRoundRacks } from './data/racks'
import { SCRAMBLE_CONSTANTS } from './useScramble'

const { TOTAL_ROUNDS, ROUND_DURATION_S } = SCRAMBLE_CONSTANTS

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))
const ScramblePlaying = lazy(() => retryImport(() => import('./components/ScramblePlaying')))
const ScrambleResults = lazy(() => retryImport(() => import('./components/ScrambleResults')))
const ScrambleFinal = lazy(() => retryImport(() => import('./components/ScrambleFinal')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const Scramble = () => {
  const sc = useScramble()
  const navigate = useNavigate()
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)

  const handleChangeGame = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGameChange(true)
    navigate('/games', { replace: true })
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    const fullState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGameChange(false)
  }, [navigate, setAwaitingGameChange])

  const handleReplay = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode === 'online' && !s.isHost) return
    const seed = Math.floor(Math.random() * 2147483647)
    const racks = pickRoundRacks(seed, TOTAL_ROUNDS)
    const now = new Date().toISOString()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))

    const fullState = {
      players: resetPlayers,
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
      await pushRoom(s.roomCode, 'scramble_countdown', fullState, now)
    } else {
      useSession.setState({
        players: resetPlayers,
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
      })
    }
  }, [])

  if (sc.currentPhase === 'scramble_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={sc.questionStartedAt}
        players={sc.players}
        localPlayerId={sc.localPlayerId}
        gameName="Scramble"
        gameEmoji="🔤"
      />
    )
  }

  if (sc.currentPhase === 'scramble_playing') {
    if (!sc.rack) return <BlobLoader text="Sincronizzazione..." />
    return (
      <Suspense fallback={<Loading />}>
        <ScramblePlaying
          rack={sc.rack}
          shuffledRack={sc.shuffledRack}
          tray={sc.tray}
          currentWord={sc.currentWord}
          usedSet={sc.usedSet}
          myWords={sc.myWords}
          scrambleWords={sc.scrambleWords}
          scrambleWordCounts={sc.scrambleWordCounts}
          players={sc.players}
          localPlayerId={sc.localPlayerId}
          roundIdx={sc.roundIdx}
          totalRounds={sc.totalRounds}
          timeLeft={sc.timeLeft}
          roundDuration={sc.roundDuration}
          isExpired={sc.isExpired}
          dictLoading={sc.dictLoading}
          errorFlash={sc.errorFlash}
          onTapTile={sc.tapTile}
          onBackspace={sc.backspace}
          onClearTray={sc.clearTray}
          onReshuffle={sc.reshuffle}
          onSubmit={sc.submitWord}
          onExit={handleChangeGame}
        />
      </Suspense>
    )
  }

  if (sc.currentPhase === 'scramble_results') {
    return (
      <Suspense fallback={<Loading />}>
        <ScrambleResults
          players={sc.players}
          localPlayerId={sc.localPlayerId}
          rack={sc.rack}
          roundIdx={sc.roundIdx}
          totalRounds={sc.totalRounds}
          scrambleRoundResults={sc.scrambleRoundResults}
          scrambleScores={sc.scrambleScores}
          scrambleWords={sc.scrambleWords}
          isHost={sc.isHost}
          isOnline={sc.isOnline}
          advancing={sc.advancing}
          onAdvance={sc.hostAdvance}
          onExit={handleChangeGame}
        />
      </Suspense>
    )
  }

  if (sc.currentPhase === 'scramble_final') {
    if (!sc.isOnline) {
      const me = sc.players.find((p) => p.id === sc.localPlayerId)
      const score = sc.scrambleScores?.[sc.localPlayerId] ?? me?.score ?? 0
      const myWordsAll = sc.scrambleWords?.[sc.localPlayerId] ?? []
      const wordsFound = Array.isArray(myWordsAll) ? myWordsAll.length : 0
      return (
        <SoloResultScreen
          player={me}
          gameEmoji="🔤"
          gameName="Scramble"
          primaryValue={score}
          primaryLabel="punti"
          stats={wordsFound > 0 ? [{ label: 'Parole', value: wordsFound }] : []}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }
    return (
      <Suspense fallback={<Loading />}>
        <ScrambleFinal
          players={sc.players}
          localPlayerId={sc.localPlayerId}
          scrambleScores={sc.scrambleScores}
          scrambleWords={sc.scrambleWords}
          isHost={sc.isHost}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      </Suspense>
    )
  }

  return <Loading />
}

export default Scramble
