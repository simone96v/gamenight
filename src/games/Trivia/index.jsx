// Entry point del gioco Trivia — modello host-controlled.
// Routes per fase: countdown / question / reveal / final.
// Tutta la logica di rete vive in useTrivia.js; qui solo orchestrazione UI.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrivia } from './useTrivia'
import CountdownOverlay from '../../components/CountdownOverlay'
import BlobLoader from '../../components/BlobLoader'
import QuestionPhase from './phases/QuestionPhase'
import RevealPhase from './phases/RevealPhase'
import FinalPhase from './phases/FinalPhase'
import SoloResultScreen from '../../components/SoloResultScreen'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'

const Trivia = () => {
  const trivia = useTrivia()
  const navigate = useNavigate()
  const setAwaitingGameChange = useSession((s) => s.setAwaitingGameChange)

  // "Cambia gioco": riporta tutti su /games per rivotare. Mantiene stanza/giocatori
  // e categoria, azzera punteggi e voti gioco.
  // Local mode: hostReplay sets phase to trivia_lobby — navigate back to lobby
  useEffect(() => {
    if (trivia.currentPhase === 'trivia_lobby' && !trivia.isOnline) {
      navigate('/trivia-lobby', { replace: true })
    }
  }, [trivia.currentPhase, trivia.isOnline, navigate])

  const handleChangeGame = async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGameChange(true)
    navigate('/games', { replace: true })
    const resetPlayers = (s.players || []).map((p) => ({
      ...p,
      score: 0,
      current_streak: 0,
      best_streak: 0,
      correct_count: 0,
      total_speed_ms: 0,
    }))
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

  // Transitional: hostReplay sets phase to trivia_lobby → useEffect navigates
  if (trivia.currentPhase === 'trivia_lobby') {
    return <BlobLoader text="Caricamento..." />
  }

  // Countdown overlay full-screen
  if (trivia.currentPhase === 'countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={trivia.questionStartedAt}
        players={trivia.players}
        localPlayerId={trivia.localPlayerId}
        category={trivia.currentCategory}
        gameName="Trivia"
        gameEmoji="🧠"
      />
    )
  }

  // Initial sync loading
  if (!trivia.currentQuestion && trivia.currentPhase !== 'final') {
    return <BlobLoader text="Sincronizzazione..." />
  }

  if (trivia.currentPhase === 'question') {
    return (
      <QuestionPhase
        currentQuestion={trivia.currentQuestion}
        questionNumber={trivia.questionNumber}
        totalQuestions={trivia.totalQuestions}
        timeLeft={trivia.timeLeft}
        timerDuration={trivia.timerDuration}
        players={trivia.players}
        localPlayerId={trivia.localPlayerId}
        localAnswer={trivia.localAnswer}
        isExpired={trivia.isExpired}
        submitting={trivia.submitting}
        isHost={trivia.isHost}
        category={trivia.currentCategory}
        onAnswer={trivia.submitAnswer}
        onExit={handleChangeGame}
      />
    )
  }

  if (trivia.currentPhase === 'reveal') {
    return (
      <RevealPhase
        currentQuestion={trivia.currentQuestion}
        questionNumber={trivia.questionNumber}
        totalQuestions={trivia.totalQuestions}
        timerDuration={trivia.timerDuration}
        players={trivia.players}
        localPlayerId={trivia.localPlayerId}
        localAnswer={trivia.localAnswer}
        myRoundResult={trivia.myRoundResult}
        roundResults={trivia.roundResults}
        isHost={trivia.isHost}
        isOnline={trivia.isOnline}
        hasMoreQuestions={trivia.hasMoreQuestions}
        advancing={trivia.advancing}
        category={trivia.currentCategory}
        onAdvance={trivia.hostAdvance}
        onExit={handleChangeGame}
      />
    )
  }

  if (trivia.currentPhase === 'final') {
    // Single-player: schermata risultato semplice.
    if (!trivia.isOnline) {
      const me = trivia.players.find((p) => p.id === trivia.localPlayerId)
      const score = me?.score ?? 0
      const correct = me?.correct_count ?? 0
      const session = trivia.gameState?.triviaSession
      const isSessionMode = !!session && (session.totalRounds ?? 1) > 1
      const hasMoreRounds = isSessionMode && (session.roundIdx + 1) < session.totalRounds

      if (hasMoreRounds) {
        // Intermediate round end
        const roundQs = session.questionsPerRound ?? 0
        return (
          <SoloResultScreen
            player={me}
            gameEmoji="🧠"
            gameName={`Round ${session.roundIdx + 1}/${session.totalRounds}`}
            primaryValue={score}
            primaryLabel="punti"
            stats={roundQs > 0 ? [
              { label: 'Corrette', value: `${correct}/${roundQs * (session.roundIdx + 1)}` },
            ] : []}
            advancing={trivia.advancing}
            replayLabel="Prossimo round"
            onReplay={trivia.hostReplay}
            onChangeGame={handleChangeGame}
          />
        )
      }

      // Final game end
      const totalQs = isSessionMode
        ? (session.totalRounds * (session.questionsPerRound ?? 0))
        : (trivia.totalQuestions ?? 0)
      return (
        <SoloResultScreen
          player={me}
          gameEmoji="🧠"
          gameName="Trivia"
          primaryValue={score}
          primaryLabel="punti"
          stats={totalQs > 0 ? [
            { label: 'Corrette', value: `${correct}/${totalQs}` },
            ...(isSessionMode ? [{ label: 'Round', value: session.totalRounds }] : []),
          ] : []}
          advancing={trivia.advancing}
          onReplay={trivia.hostReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }
    return (
      <FinalPhase
        players={trivia.players}
        localPlayerId={trivia.localPlayerId}
        isHost={trivia.isHost}
        advancing={trivia.advancing}
        onReplay={trivia.hostReplay}
        onChangeGame={handleChangeGame}
        session={trivia.gameState?.triviaSession}
      />
    )
  }

  // Fallback (transitional states)
  return <BlobLoader text="Caricamento..." />
}

export default Trivia
