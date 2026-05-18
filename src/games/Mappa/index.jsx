import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMappa } from './useMappa'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import Spinner from '../../components/ui/Spinner'
import GameLeaderboard from '../../components/GameLeaderboard'
import SoloEndScreen from '../../components/SoloEndScreen'
import { loadMappaDeck } from '../../lib/mappaDeck'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const MappaQuestion = lazy(() => retryImport(() => import('./components/MappaQuestion')))
const MappaReveal = lazy(() => retryImport(() => import('./components/MappaReveal')))

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
      selectedGameCategory: s.gameState?.selectedGameCategory ?? null,
      gameCategoryVotes: {},
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
    const deckSize = s.gameState?.mappaRounds ?? s.gameState?.deck?.length ?? 10
    const difficulty = s.gameState?.mappaDifficulty ?? 'mix'
    const deck = await loadMappaDeck(deckSize, difficulty)
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
        mappaDifficulty: difficulty,
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
          mappaDifficulty: difficulty,
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
          isOnline={mappa.isOnline}
          onAdvance={mappa.hostAdvance}
          onExit={handleChangeGame}
        />
      </Suspense>
    )
  }

  if (mappa.currentPhase === 'mappa_final') {
    // Solo single-player → modale compatta.
    if (!mappa.isOnline) {
      const me = mappa.players.find((p) => p.id === mappa.localPlayerId) ?? mappa.players[0]
      const score = me?.score ?? 0
      return (
        <SoloEndScreen
          open
          gameEmoji="🗺️"
          gameName="Mappa"
          player={me}
          primaryValue={score}
          primaryLabel="punti"
          stats={mappa.totalQuestions > 0
            ? [{ label: 'luoghi', value: mappa.totalQuestions }]
            : []}
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }

    return (
      <GameLeaderboard
        players={mappa.players}
        localPlayerId={mappa.localPlayerId}
        gameName="Indovina Dove"
        subtitle={mappa.totalQuestions > 0
          ? `${mappa.totalQuestions} ${mappa.totalQuestions === 1 ? 'luogo' : 'luoghi'} indovinati`
          : ''}
        canControl={mappa.isHost || !mappa.isOnline}
        advancing={replaying}
        onReplay={handleReplay}
        onChangeGame={handleChangeGame}
      />
    )
  }

  return <Loading />
}

export default Mappa
