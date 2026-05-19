// Entry point Logo Quiz — phase router uniforme local/online.

import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import BlobLoader from '../../components/BlobLoader'
import GameLeaderboard from '../../components/GameLeaderboard'
import SoloEndScreen from '../../components/SoloEndScreen'
import { useLogoQuiz } from './useLogoQuiz'
import QuestionPhase from './phases/QuestionPhase'
import RevealPhase from './phases/RevealPhase'
import MvpAwards from './components/MvpAwards'

const LogoQuiz = () => {
  const lq = useLogoQuiz()
  const navigate = useNavigate()
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  // Local mode: replay scrive logoquiz_lobby → torna alla lobby
  const currentPhase = useSession((s) => s.currentPhase)
  useEffect(() => {
    if (currentPhase === 'logoquiz_lobby' && !lq.isOnline) {
      navigate('/logoquiz-lobby', { replace: true })
    }
  }, [currentPhase, lq.isOnline, navigate])

  const resetGameState = (gs) => ({
    ...gs,
    lqSession: null,
    lqDeck: [],
    lqRoundIdx: 0,
    lqAnswers: {},
    lqRoundResult: null,
    lqScores: {},
    lqCorrectCount: {},
    lqStreaks: {},
    lqBestStreak: {},
    lqTotalSpeedMs: {},
  })

  const handleChangeGame = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      useSession.setState({ gameState: resetGameState(s.gameState) })
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 }))
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
    if (s.roomCode) await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const handleReplay = useCallback(async () => {
    const s = useSession.getState()
    if (!s.isHost && s.mode === 'online') return
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 }))
    const fullState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: 'logoquiz',
      selectedGame: 'logoquiz',
      lqSession: null,
      lqDeck: [],
      lqRoundIdx: 0,
      lqAnswers: {},
      lqRoundResult: null,
      lqScores: {},
      lqCorrectCount: {},
      lqStreaks: {},
      lqBestStreak: {},
      lqTotalSpeedMs: {},
    }
    if (s.mode === 'online' && s.roomCode) {
      await pushRoom(s.roomCode, 'logoquiz_lobby', fullState)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: fullState,
        currentPhase: 'logoquiz_lobby',
      })
      navigate('/logoquiz-lobby', { replace: true })
    }
  }, [navigate])

  if (lq.screen === 'countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={lq.questionStartedAt}
        players={lq.players}
        localPlayerId={lq.localPlayerId}
        gameName="Logo Quiz"
        gameEmoji="🏷️"
        onComplete={lq.handleCountdownComplete}
      />
    )
  }

  if (lq.screen === 'loading' || (!lq.round && lq.screen !== 'final')) {
    return <BlobLoader text="Sincronizzazione…" />
  }

  if (lq.screen === 'question') {
    return (
      <QuestionPhase
        round={lq.round}
        questionNumber={lq.roundIdx + 1}
        totalQuestions={lq.totalRounds}
        timeLeft={lq.timeLeft}
        timerDuration={lq.durationS}
        players={lq.players}
        localPlayerId={lq.localPlayerId}
        localAnswer={lq.localAnswer}
        isExpired={lq.isExpired}
        submitting={false}
        isHost={lq.isHost}
        lqScores={lq.lqScores}
        onAnswer={lq.submitAnswer}
        onExit={handleChangeGame}
      />
    )
  }

  if (lq.screen === 'reveal') {
    return (
      <RevealPhase
        round={lq.round}
        questionNumber={lq.roundIdx + 1}
        totalQuestions={lq.totalRounds}
        timerDuration={lq.durationS}
        players={lq.players}
        localPlayerId={lq.localPlayerId}
        lqAnswers={lq.lqAnswers}
        roundResult={lq.roundResult}
        lqScores={lq.lqScores}
        isHost={lq.isHost}
        isOnline={lq.isOnline}
        hasMoreRounds={lq.hasMoreRounds}
        advancing={false}
        onAdvance={lq.hostAdvance}
        onExit={handleChangeGame}
      />
    )
  }

  if (lq.screen === 'final') {
    const playersWithScores = lq.players.map((p) => ({
      ...p,
      score: lq.lqScores?.[p.id] ?? p.score ?? 0,
      correct_count: lq.lqCorrectCount?.[p.id] ?? 0,
      best_streak: lq.lqBestStreak?.[p.id] ?? p.best_streak ?? 0,
      total_speed_ms: lq.lqTotalSpeedMs?.[p.id] ?? p.total_speed_ms ?? 0,
    }))

    if (!lq.isOnline) {
      const me = playersWithScores.find((p) => p.id === lq.localPlayerId) ?? playersWithScores[0]
      return (
        <SoloEndScreen
          open
          gameEmoji="🏷️"
          gameName="Logo Quiz"
          player={me}
          primaryValue={me?.score ?? 0}
          primaryLabel="punti"
          stats={[{ label: 'indovinati', value: me?.correct_count ?? 0 }]}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }

    return (
      <GameLeaderboard
        players={playersWithScores}
        localPlayerId={lq.localPlayerId}
        gameName="Logo Quiz"
        extraColumn={{ label: 'indovinati', get: (p) => p.correct_count ?? 0 }}
        extras={<MvpAwards players={playersWithScores} />}
        canControl={lq.isHost || !lq.isOnline}
        onReplay={handleReplay}
        onChangeGame={handleChangeGame}
      />
    )
  }

  return <BlobLoader text="Caricamento…" />
}

export default LogoQuiz
