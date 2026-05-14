import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMappa } from './useMappa'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import Spinner from '../../components/ui/Spinner'
import questions from './data/mappa.json'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const MappaQuestion = lazy(() => retryImport(() => import('./components/MappaQuestion')))
const MappaReveal = lazy(() => retryImport(() => import('./components/MappaReveal')))
const MappaFinal = lazy(() => retryImport(() => import('./components/MappaFinal')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const Mappa = () => {
  const mappa = useMappa()
  const navigate = useNavigate()
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)
  const [replaying, setReplaying] = useState(false)

  const handleChangeGame = async () => {
    setAwaitingGameChange(true)
    navigate('/games', { replace: true })
    const s = useSession.getState()
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
  }

  const handleReplay = async () => {
    if (replaying) return
    setReplaying(true)
    const s = useSession.getState()
    const pool = [...questions.questions]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const deckSize = s.gameState?.mappaRounds ?? s.gameState?.deck?.length ?? 10
    const deck = pool.slice(0, Math.min(deckSize, pool.length))
    const now = new Date().toISOString()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))

    const mappaRounds = s.gameState?.mappaRounds ?? deckSize
    if (s.mode === 'online' && s.roomCode) {
      const fullState = {
        players: resetPlayers,
        currentIdx: 0,
        round: 0,
        activeGame: 'mappa',
        deck,
        current_round: 0,
        current_question: deck[0],
        pins: {},
        timer_duration: s.gameState?.timer_duration ?? 30,
        mappaRounds,
      }
      await pushRoom(s.roomCode, 'mappa_countdown', fullState, now)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: {
          deck,
          current_round: 0,
          current_question: deck[0],
          pins: {},
          timer_duration: s.gameState?.timer_duration ?? 30,
          mappaRounds,
        },
        currentPhase: 'mappa_countdown',
        questionStartedAt: now,
      })
    }
    setReplaying(false)
  }

  if (mappa.currentPhase === 'mappa_countdown') {
    return <Loading />
  }

  if (!mappa.currentQuestion && mappa.currentPhase !== 'mappa_final') {
    return <Loading />
  }

  if (mappa.currentPhase === 'mappa_question') {
    return (
      <Suspense fallback={<Loading />}>
        <MappaQuestion
          question={mappa.currentQuestion}
          questionNumber={mappa.questionNumber}
          totalQuestions={mappa.totalQuestions}
          timeLeft={mappa.timeLeft}
          timerDuration={mappa.timerDuration}
          players={mappa.players}
          localPlayerId={mappa.localPlayerId}
          isHost={mappa.isHost}
          localPin={mappa.localPin}
          confirmed={mappa.confirmed}
          isExpired={mappa.isExpired}
          submittedPins={mappa.pins}
          onPinDrop={mappa.placePin}
          onConfirm={mappa.confirmPin}
          onExit={handleChangeGame}
        />
      </Suspense>
    )
  }

  if (mappa.currentPhase === 'mappa_reveal') {
    return (
      <Suspense fallback={<Loading />}>
        <MappaReveal
          question={mappa.currentQuestion}
          questionNumber={mappa.questionNumber}
          totalQuestions={mappa.totalQuestions}
          players={mappa.players}
          localPlayerId={mappa.localPlayerId}
          isHost={mappa.isHost}
          pins={mappa.pins}
          hasMoreQuestions={mappa.hasMoreQuestions}
          advancing={mappa.advancing}
          onAdvance={mappa.hostAdvance}
          onExit={handleChangeGame}
        />
      </Suspense>
    )
  }

  if (mappa.currentPhase === 'mappa_final') {
    return (
      <Suspense fallback={<Loading />}>
        <MappaFinal
          players={mappa.players}
          localPlayerId={mappa.localPlayerId}
          isHost={mappa.isHost}
          advancing={replaying}
          totalQuestions={mappa.totalQuestions}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      </Suspense>
    )
  }

  return <Loading />
}

export default Mappa
