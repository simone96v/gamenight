import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatchBlob } from './useCatchBlob'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import CatchBlobLeaderboard from './components/CatchBlobLeaderboard'
import { submitCatchBlobScore } from './useCatchBlobLeaderboard'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const CatchBlobPlaying = lazy(() => retryImport(() => import('./components/CatchBlobPlaying')))
const CatchBlobResults = lazy(() => retryImport(() => import('./components/CatchBlobResults')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const CatchBlob = () => {
  const cb = useCatchBlob()
  const navigate = useNavigate()
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const submitFiredRef = useRef(false)

  // Submit globale + apri overlay quando entriamo in final
  useEffect(() => {
    if (cb.currentPhase !== 'catchblob_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = cb.players.find((p) => p.id === cb.localPlayerId)
    const score = cb.totalScores?.[cb.localPlayerId] ?? me?.score ?? 0
    if (!me || score <= 0) {
      setLbOpen(true)
      return
    }
    submitCatchBlobScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: cb.isOnline ? 'online' : 'solo',
    }).then(() => setLbOpen(true))
  }, [cb.currentPhase, cb.players, cb.localPlayerId, cb.totalScores, cb.isOnline])

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
        activeGame: 'catchblob',
        currentSeed: newSeed,
        currentRoundIdx: 0,
        totalRounds: 1,
        roundDuration: 0,
        roundScores: {},
        roundFinished: {},
        totalScores: {},
      }
      await pushRoom(s.roomCode, 'catchblob_countdown', fullState, now)
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
        currentPhase: 'catchblob_countdown',
        questionStartedAt: now,
      })
    }
    setReplaying(false)
  }, [replaying])

  if (cb.currentPhase === 'catchblob_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={cb.questionStartedAt}
        onComplete={() => {}}
        players={cb.players}
        localPlayerId={cb.localPlayerId}
        gameName="Catch The Blob"
        gameEmoji="🧺"
      />
    )
  }

  if (cb.currentPhase === 'catchblob_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <CatchBlobPlaying
          seed={cb.currentSeed}
          blobColor={cb.blobColor}
          isExpired={cb.isExpired}
          scoreSubmitted={cb.scoreSubmitted}
          onSubmitScore={cb.submitScore}
          onUpdateScore={cb.updateScorePeriodic}
          players={cb.players}
          localPlayerId={cb.localPlayerId}
          isOnline={cb.isOnline}
          isHost={cb.isHost}
          onGoToClassifica={cb.goToClassifica}
        />
      </Suspense>
    )
  }

  if (cb.currentPhase === 'catchblob_results') {
    return (
      <Suspense fallback={<Loading />}>
        <CatchBlobResults
          players={cb.players}
          localPlayerId={cb.localPlayerId}
          isHost={cb.isHost}
          roundScores={cb.roundScores}
          currentRoundIdx={cb.currentRoundIdx}
          totalRounds={cb.totalRounds}
          advancing={cb.advancing}
          onAdvance={cb.hostAdvance}
        />
      </Suspense>
    )
  }

  if (cb.currentPhase === 'catchblob_final') {
    return (
      <>
        <Suspense fallback={<Loading />}>
          <CatchBlobResults
            players={cb.players}
            localPlayerId={cb.localPlayerId}
            isHost={cb.isHost || !cb.isOnline}
            roundScores={cb.totalScores}
            totalScores={cb.totalScores}
            currentRoundIdx={cb.currentRoundIdx}
            totalRounds={cb.totalRounds}
            advancing={replaying}
            isFinal
            onReplay={handleReplay}
            onChangeGame={handleChangeGame}
            onShowLeaderboard={() => setLbOpen(true)}
          />
        </Suspense>
        <CatchBlobLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default CatchBlob
