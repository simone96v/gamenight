import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import { useSentenza, initSentenzaState } from './useSentenza'
import JudgingSetup from './components/JudgingSetup'
import SentenzaSelection from './components/SentenzaSelection'
import SentenzaSelectionWaiting from './components/SentenzaSelectionWaiting'
import SentenzaJudging from './components/SentenzaJudging'
import SentenzaJudgingWaiting from './components/SentenzaJudgingWaiting'
import SentenzaReveal from './components/SentenzaReveal'
import GameLeaderboard from '../../components/GameLeaderboard'

const SELECTION_TIMER = 30
const JUDGING_TIMER = 30

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const Sentenza = () => {
  const g = useSentenza()
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
    if (s.mode === 'online' && s.roomCode) {
      await pushRoom(s.roomCode, 'game_voting', fullState)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: { selectedCategory: s.gameState?.selectedCategory ?? null },
        currentPhase: 'game_voting',
        activeGame: null,
      })
    }
    setAwaitingGameChange(false)
  }

  const handleReplay = async () => {
    if (replaying) return
    setReplaying(true)
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    const rounds = s.gameState?.sentenzaRounds ?? s.gameState?.totalRounds ?? 8
    const sentenzaState = initSentenzaState(resetPlayers, rounds)
    const now = new Date().toISOString()

    if (s.mode === 'online' && s.roomCode) {
      const fullState = {
        players: resetPlayers,
        currentIdx: 0,
        round: 0,
        activeGame: 'sentenza',
        sentenzaRounds: rounds,
        ...sentenzaState,
      }
      await pushRoom(s.roomCode, 'sentenza_countdown', fullState, now)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: { ...sentenzaState, sentenzaRounds: rounds },
        currentPhase: 'sentenza_countdown',
        questionStartedAt: now,
      })
    }
    setReplaying(false)
  }

  // Props comuni passati a tutte le fasi di gioco
  const commonProps = {
    currentRound: g.currentRound + 1,
    totalRounds: g.totalRounds,
    players: g.players,
    localPlayerId: g.localPlayerId,
    isHost: g.isHost,
    onExit: handleChangeGame,
  }

  if (g.currentPhase === 'sentenza_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={g.questionStartedAt}
        players={g.players}
        localPlayerId={g.localPlayerId}
        gameName="Sentenza"
        gameEmoji={'⚖️'}
      />
    )
  }

  if (g.currentPhase === 'sentenza_judging_setup') {
    return (
      <JudgingSetup
        {...commonProps}
        judgeName={g.judge?.name}
        judgeColor={g.judge?.color}
        round={g.currentRound + 1}
        prompt={g.currentPrompt?.text}
      />
    )
  }

  if (g.currentPhase === 'sentenza_selection') {
    return g.isJudge ? (
      <SentenzaSelectionWaiting
        {...commonProps}
        prompt={g.currentPrompt?.text}
        challengers={g.challengers}
        submittedIds={g.submittedIds}
        timeLeft={g.timeLeft}
        total={SELECTION_TIMER}
      />
    ) : (
      <SentenzaSelection
        {...commonProps}
        key={g.currentRound}
        prompt={g.currentPrompt?.text}
        answers={g.myHand}
        timeLeft={g.timeLeft}
        total={SELECTION_TIMER}
        judgeName={g.judge?.name}
        judgeColor={g.judge?.color}
        onSubmit={g.submitProof}
      />
    )
  }

  if (g.currentPhase === 'sentenza_judging') {
    return g.isJudge ? (
      <SentenzaJudging
        {...commonProps}
        key={g.currentRound}
        prompt={g.currentPrompt?.text}
        proofs={g.proofs}
        timeLeft={g.timeLeft}
        total={JUDGING_TIMER}
        onVerdict={g.emitVerdict}
      />
    ) : (
      <SentenzaJudgingWaiting
        {...commonProps}
        prompt={g.currentPrompt?.text}
        myAnswer={g.myAnswer}
        judgeName={g.judge?.name}
        judgeColor={g.judge?.color}
        timeLeft={g.timeLeft}
        total={JUDGING_TIMER}
      />
    )
  }

  if (g.currentPhase === 'sentenza_reveal') {
    return (
      <SentenzaReveal
        {...commonProps}
        prompt={g.currentPrompt?.text}
        winnerAnswer={g.winnerProof?.text}
        winnerName={g.winnerPlayer?.name}
        winnerColor={g.winnerPlayer?.color}
        otherProofs={g.otherProofs}
        advancing={g.advancing}
        hasMoreRounds={g.hasMoreRounds}
        onNext={g.hostAdvance}
      />
    )
  }

  if (g.currentPhase === 'sentenza_final') {
    return (
      <GameLeaderboard
        players={g.players}
        localPlayerId={g.localPlayerId}
        gameName="Giudice Supremo"
        subtitle="Chi ha vinto più sentenze?"
        extraColumn={{ label: '⚖️', get: (p) => p.roundsWon ?? 0 }}
        canControl={g.isHost}
        advancing={replaying}
        onReplay={handleReplay}
        onChangeGame={handleChangeGame}
      />
    )
  }

  return <Loading />
}

export default Sentenza
