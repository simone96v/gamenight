// Entry point Emoji Quiz — phase router uniforme local/online.
// Layout coerente con Trivia (AppHeader + GameHUD + card + 2x2 risposte).

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import { loadEmojiQuizDeck } from '../../lib/emojiQuizDeck'
import CountdownOverlay from '../../components/CountdownOverlay'
import BlobLoader from '../../components/BlobLoader'
import { useEmojiQuiz } from './useEmojiQuiz'
import { TOTAL_ROUNDS } from './config'
import EmojiQuizQuestionPhase from './components/EmojiQuizQuestionPhase'
import EmojiQuizRevealPhase from './components/EmojiQuizRevealPhase'
import EmojiQuizFinalPhase from './components/EmojiQuizFinalPhase'

const EmojiQuiz = () => {
  const eq = useEmojiQuiz()
  const navigate = useNavigate()
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  // "Esci" / "Cambia gioco": riporta tutti su /games (online) o /solo/games (local).
  const handleChangeGame = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
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
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  // Rigioca — l'host (o il solo player in local) carica un nuovo deck e ricomincia.
  const handleReplay = useCallback(async () => {
    const s = useSession.getState()
    if (!s.isHost && s.mode === 'online') return
    const deck = await loadEmojiQuizDeck(TOTAL_ROUNDS)
    const now = new Date().toISOString()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 }))
    const fullState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: 'emojiquiz',
      eqDeck: deck,
      eqRoundIdx: 0,
      eqRoundAnswers: {},
      eqRoundResult: null,
      eqScores: {},
      eqStreaks: {},
      eqCorrectCount: {},
      eqRoundLog: [],
    }
    if (s.mode === 'online' && s.roomCode) {
      await pushRoom(s.roomCode, 'emojiquiz_countdown', fullState, now)
    } else {
      useSession.setState({
        players: resetPlayers,
        gameState: fullState,
        currentPhase: 'emojiquiz_countdown',
        questionStartedAt: now,
        activeGame: 'emojiquiz',
      })
    }
  }, [])

  // ── Countdown overlay (3-2-1-VIA!) ──
  if (eq.screen === 'countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={eq.questionStartedAt}
        players={eq.players}
        localPlayerId={eq.localPlayerId}
        gameName="Emoji Quiz"
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
        hasMoreRounds={eq.hasMoreRounds}
        advancing={false}
        onAdvance={eq.hostAdvance}
        onExit={handleChangeGame}
      />
    )
  }

  if (eq.screen === 'final') {
    return (
      <EmojiQuizFinalPhase
        players={eq.players}
        localPlayerId={eq.localPlayerId}
        eqScores={eq.eqScores}
        eqCorrectCount={eq.eqCorrectCount}
        totalRounds={eq.totalRounds}
        isHost={eq.isHost}
        advancing={false}
        onReplay={handleReplay}
        onChangeGame={handleChangeGame}
      />
    )
  }

  return <BlobLoader text="Caricamento..." />
}

export default EmojiQuiz
