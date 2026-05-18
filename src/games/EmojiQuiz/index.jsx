// Entry point Emoji Quiz — phase router uniforme local/online.
// Layout coerente con Trivia (AppHeader + GameHUD + card + 2x2 risposte).

import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import BlobLoader from '../../components/BlobLoader'
import GameLeaderboard from '../../components/GameLeaderboard'
import SoloEndScreen from '../../components/SoloEndScreen'
import { useEmojiQuiz } from './useEmojiQuiz'
import { TOTAL_ROUNDS } from './config'
import EmojiQuizQuestionPhase from './components/EmojiQuizQuestionPhase'
import EmojiQuizRevealPhase from './components/EmojiQuizRevealPhase'

const EmojiQuiz = () => {
  const eq = useEmojiQuiz()
  const navigate = useNavigate()
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  // Local mode: hostNextRound sets phase to emojiquiz_lobby — navigate back to lobby
  const currentPhase = useSession((s) => s.currentPhase)
  useEffect(() => {
    if (currentPhase === 'emojiquiz_lobby' && !eq.isOnline) {
      navigate('/emojiquiz-lobby', { replace: true })
    }
  }, [currentPhase, eq.isOnline, navigate])

  // "Esci" / "Cambia gioco": riporta tutti su /games (online) o /solo/games (local).
  // Resetta anche eqSession così un eventuale rientro nel gioco riparte fresh.
  const handleChangeGame = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      // Solo: pulisci lo stato di gioco prima di uscire.
      useSession.setState({
        gameState: {
          ...s.gameState,
          eqSession: null,
          eqDeck: [],
          eqRoundIdx: 0,
          eqRoundAnswers: {},
          eqHintUsed: {},
          eqRoundResult: null,
          eqRoundLog: [],
          eqScores: {},
          eqStreaks: {},
          eqCorrectCount: {},
        },
      })
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

  // Rigioca — resetta la sessione e torna in lobby per ri-spinnare la ruota.
  const handleReplay = useCallback(async () => {
    const s = useSession.getState()
    if (!s.isHost && s.mode === 'online') return
    const prevSession = s.gameState?.eqSession ?? {}
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 }))
    const fullState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: 'emojiquiz',
      selectedGame: 'emojiquiz',
      eqSession: {
        roundIdx: 0,
        totalRounds: prevSession.totalRounds ?? 1,
        questionsPerRound: prevSession.questionsPerRound ?? TOTAL_ROUNDS,
        categoriesPlayed: [],
        currentCategory: null,
        spinTarget: null,
        launching: false,
      },
      eqDeck: [],
      eqRoundIdx: 0,
      eqRoundAnswers: {},
      eqHintUsed: {},
      eqRoundResult: null,
      eqRoundLog: [],
      eqScores: {},
      eqStreaks: {},
      eqCorrectCount: {},
    }
    if (s.mode === 'online' && s.roomCode) {
      await pushRoom(s.roomCode, 'emojiquiz_lobby', fullState)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: fullState,
        currentPhase: 'emojiquiz_lobby',
      })
      navigate('/emojiquiz-lobby', { replace: true })
    }
  }, [navigate])

  // ── Countdown overlay (3-2-1-VIA!) ──
  if (eq.screen === 'countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={eq.questionStartedAt}
        players={eq.players}
        localPlayerId={eq.localPlayerId}
        gameName="Movie Quiz"
        gameEmoji="🎬"
        onComplete={eq.handleCountdownComplete}
      />
    )
  }

  // ── Loading (in attesa di sync iniziale, o transitional) ──
  if (eq.screen === 'loading' || (!eq.puzzle && eq.screen !== 'final')) {
    return <BlobLoader text="Sincronizzazione..." />
  }

  if (eq.screen === 'question') {
    return (
      <EmojiQuizQuestionPhase
        puzzle={eq.puzzle}
        roundIdx={eq.roundIdx}
        totalRounds={eq.totalRounds}
        timeLeft={eq.timeLeft}
        timerDuration={eq.timerDuration}
        players={eq.players}
        localPlayerId={eq.localPlayerId}
        guess={eq.guess}
        setGuess={eq.setGuess}
        wrongFlash={eq.wrongFlash}
        submitted={eq.submitted}
        hintUsed={eq.hintUsed}
        inputRef={eq.inputRef}
        inputWrapRef={eq.inputWrapRef}
        isExpired={eq.isExpired}
        isHost={eq.isHost}
        eqScores={eq.eqScores}
        onSubmit={eq.submitAnswer}
        onUseHint={eq.useHint}
        onExit={handleChangeGame}
      />
    )
  }

  if (eq.screen === 'reveal') {
    return (
      <EmojiQuizRevealPhase
        puzzle={eq.puzzle}
        roundIdx={eq.roundIdx}
        totalRounds={eq.totalRounds}
        timerDuration={eq.timerDuration}
        players={eq.players}
        localPlayerId={eq.localPlayerId}
        eqRoundAnswers={eq.eqRoundAnswers}
        eqRoundResult={eq.eqRoundResult}
        eqScores={eq.eqScores}
        isHost={eq.isHost}
        isOnline={eq.isOnline}
        hasMoreRounds={eq.hasMoreRounds}
        advancing={false}
        onAdvance={eq.hostAdvance}
        onExit={handleChangeGame}
      />
    )
  }

  if (eq.screen === 'final') {
    // Merge dei punteggi/conteggi nei player object così GameLeaderboard
    // può ordinare e mostrare in modo standard.
    const playersWithScores = eq.players.map((p) => ({
      ...p,
      score: eq.eqScores?.[p.id] ?? p.score ?? 0,
      correct_count: eq.eqCorrectCount?.[p.id] ?? 0,
    }))
    const moreRounds = eq.sessionHasMoreRounds
    const subtitle = moreRounds
      ? `Round ${eq.sessionRoundIdx + 1}/${eq.sessionTotalRounds}`
      : eq.sessionTotalRounds > 1
        ? `Score cumulativo dei ${eq.sessionTotalRounds} round`
        : ''

    // Solo single-player a fine session → modale compatta.
    if (!eq.isOnline && !moreRounds) {
      const me = playersWithScores.find((p) => p.id === eq.localPlayerId) ?? playersWithScores[0]
      return (
        <SoloEndScreen
          open
          gameEmoji="🎬"
          gameName="Movie Quiz"
          player={me}
          primaryValue={me?.score ?? 0}
          primaryLabel="punti"
          stats={[{ label: 'indovinate', value: me?.correct_count ?? 0 }]}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
        />
      )
    }

    return (
      <GameLeaderboard
        players={playersWithScores}
        localPlayerId={eq.localPlayerId}
        gameName={moreRounds ? 'Round completato' : 'Movie Quiz'}
        subtitle={subtitle}
        extraColumn={{ label: 'indovinate', get: (p) => p.correct_count ?? 0 }}
        canControl={eq.isHost || !eq.isOnline}
        hasMoreRounds={moreRounds}
        onReplay={moreRounds ? eq.hostNextRound : handleReplay}
        onChangeGame={handleChangeGame}
      />
    )
  }

  return <BlobLoader text="Caricamento..." />
}

export default EmojiQuiz
