import { lazy, Suspense, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlobJump } from './useBlobJump'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloResultScreen from '../../components/SoloResultScreen'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const BlobJumpPlaying = lazy(() => retryImport(() => import('./components/BlobJumpPlaying')))
const BlobJumpResults = lazy(() => retryImport(() => import('./components/BlobJumpResults')))
const BlobJumpFinal = lazy(() => retryImport(() => import('./components/BlobJumpFinal')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const BlobJump = () => {
  const bj = useBlobJump()
  const navigate = useNavigate()
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)
  const [replaying, setReplaying] = useState(false)

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
    await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGameChange(false)
  }, [navigate, setAwaitingGameChange])

  const handleReplay = useCallback(async () => {
    if (replaying) return
    setReplaying(true)
    const s = useSession.getState()
    const newSeed = Math.floor(Math.random() * 2147483647)
    const now = new Date().toISOString()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))

    if (s.mode === 'online' && s.roomCode) {
      const fullState = {
        players: resetPlayers,
        currentIdx: 0,
        round: 0,
        activeGame: 'blobjump',
        currentSeed: newSeed,
        currentRoundIdx: 0,
        totalRounds: 1,
        roundDuration: 0,
        roundScores: {},
        roundFinished: {},
        totalScores: {},
      }
      await pushRoom(s.roomCode, 'blobjump_countdown', fullState, now)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: {
          currentSeed: newSeed,
          currentRoundIdx: 0,
          totalRounds: 1,
          roundDuration: 0,
          roundScores: {},
          roundFinished: {},
          totalScores: {},
        },
        currentPhase: 'blobjump_countdown',
        questionStartedAt: now,
      })
    }
    setReplaying(false)
  }, [replaying])

  if (bj.currentPhase === 'blobjump_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={bj.questionStartedAt}
        onComplete={() => {}}
        players={bj.players}
        localPlayerId={bj.localPlayerId}
        gameName="Blob Jump"
        gameEmoji="🦘"
      />
    )
  }

  if (bj.currentPhase === 'blobjump_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <BlobJumpPlaying
          seed={bj.currentSeed}
          blobColor={bj.blobColor}
          isExpired={bj.isExpired}
          scoreSubmitted={bj.scoreSubmitted}
          onSubmitScore={bj.submitScore}
          onUpdateScore={bj.updateScorePeriodic}
          players={bj.players}
          localPlayerId={bj.localPlayerId}
          isOnline={bj.isOnline}
          isHost={bj.isHost}
          onGoToClassifica={bj.goToClassifica}
        />
      </Suspense>
    )
  }

  if (bj.currentPhase === 'blobjump_results') {
    return (
      <Suspense fallback={<Loading />}>
        <BlobJumpResults
          players={bj.players}
          localPlayerId={bj.localPlayerId}
          isHost={bj.isHost}
          roundScores={bj.roundScores}
          currentRoundIdx={bj.currentRoundIdx}
          totalRounds={bj.totalRounds}
          advancing={bj.advancing}
          onAdvance={bj.hostAdvance}
        />
      </Suspense>
    )
  }

  if (bj.currentPhase === 'blobjump_final') {
    // Single-player: schermata risultato semplice.
    if (!bj.isOnline) {
      const me = bj.players.find((p) => p.id === bj.localPlayerId)
      const height = bj.totalScores?.[bj.localPlayerId] ?? me?.score ?? 0
      return (
        <SoloResultScreen
          player={me}
          gameEmoji="🦘"
          gameName="Blob Jump"
          primaryValue={height}
          primaryLabel="metri"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }
    return (
      <Suspense fallback={<Loading />}>
        <BlobJumpFinal
          players={bj.players}
          localPlayerId={bj.localPlayerId}
          isHost={bj.isHost}
          totalScores={bj.totalScores}
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      </Suspense>
    )
  }

  return <Loading />
}

export default BlobJump
