// Entry point Emoji Quiz.
// Local: Home → Playing → RoundEnd → GameEnd (interno al hook).
// Online: phase-driven via store (emojiquiz_countdown/playing/results/final).

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../stores/useSession'
import { pushRoom } from '../../lib/room'
import CountdownOverlay from '../../components/CountdownOverlay'
import { useEmojiQuiz, SCREENS } from './useEmojiQuiz'
import { EMOJI_QUIZ_CSS } from './styles'
import EmojiQuizHome from './components/EmojiQuizHome'
import EmojiQuizPlaying from './components/EmojiQuizPlaying'
import EmojiQuizRoundEnd from './components/EmojiQuizRoundEnd'
import EmojiQuizGameEnd from './components/EmojiQuizGameEnd'

const EmojiQuiz = () => {
  const eq = useEmojiQuiz()
  const navigate = useNavigate()
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const localPlayerId = useSession((s) => s.localPlayerId)

  const handleChangeGame = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
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
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  // Rivincita online — l'host resetta scores/log e riparte con un nuovo deck.
  const handleReplay = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online' || !s.isHost) return
    // Carica nuovo deck.
    const { loadEmojiQuizDeck } = await import('../../lib/emojiQuizDeck')
    const { TOTAL_ROUNDS } = await import('./config')
    const deck = await loadEmojiQuizDeck(TOTAL_ROUNDS)
    const now = new Date().toISOString()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    const fullState = {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: 'emojiquiz',
      eqDeck: deck,
      eqRoundIdx: 0,
      eqGuesses: {},
      eqHintUsed: {},
      eqRoundResult: null,
      eqScores: {},
      eqStreaks: {},
      eqRoundLog: [],
    }
    if (s.roomCode) {
      await pushRoom(s.roomCode, 'emojiquiz_countdown', fullState, now)
    }
  }, [])

  // Online countdown 3-2-1 (riusa CountdownOverlay del progetto).
  if (eq.isOnline && eq.screen === 'countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={questionStartedAt}
        players={eq.players}
        localPlayerId={localPlayerId}
        gameName="Emoji Quiz"
        gameEmoji="🎬"
        onComplete={eq.handleCountdownComplete}
      />
    )
  }

  if (eq.isOnline && eq.screen === 'loading') {
    return (
      <div className="eq-root">
        <style>{EMOJI_QUIZ_CSS}</style>
        <div className="eq-bg-blob eq-b1" />
        <div className="eq-app">
          <div className="eq-screen" style={{ padding: '40px 0' }}>
            <div className="eq-eyebrow">EMOJI QUIZ</div>
            <p className="eq-lede">Sincronizzazione…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="eq-root">
      <style>{EMOJI_QUIZ_CSS}</style>
      <div className="eq-bg-blob eq-b1" />
      <div className="eq-bg-blob eq-b2" />
      <div className="eq-bg-blob eq-b3" />

      <div className="eq-app">
        <button className="eq-exit" onClick={handleChangeGame} aria-label="Esci">←</button>
        <button
          className="eq-mute"
          onClick={eq.toggleSound}
          aria-label="audio"
          title={eq.soundOn ? 'Audio attivo' : 'Audio muto'}
        >
          {eq.soundOn ? '🔊' : '🔇'}
        </button>

        {/* Local home — non visibile online (phase è guida lì). */}
        {!eq.isOnline && eq.screen === SCREENS.HOME && <EmojiQuizHome onStart={eq.startGame} />}

        {eq.screen === SCREENS.PLAYING && eq.puzzle && (
          <EmojiQuizPlaying
            puzzle={eq.puzzle}
            roundIdx={eq.roundIdx}
            pScore={eq.pScore}
            oScore={eq.oScore}
            pName={eq.pName}
            oName={eq.oName}
            pColor={eq.pColor}
            oColor={eq.oColor}
            playerCombo={eq.playerCombo}
            oppCombo={eq.oppCombo}
            oppThinking={!eq.isOnline || !eq.submitted}
            timePct={eq.timePct}
            timeLeft={eq.timeLeft}
            guess={eq.guess}
            setGuess={eq.setGuess}
            submitGuess={eq.submitGuess}
            hint={eq.hint}
            useHint={eq.useHint}
            redFlash={eq.redFlash}
            inputRef={eq.inputRef}
            inputWrapRef={eq.inputWrapRef}
            disabled={!!eq.submitted}
          />
        )}

        {eq.screen === SCREENS.ROUND_END && eq.roundResult && (
          <EmojiQuizRoundEnd
            result={eq.roundResult}
            roundIdx={eq.roundIdx}
            onNext={eq.advance}
            oppName={eq.isOnline ? (eq.roundResult.winnerName ?? eq.oName) : 'Blobby'}
            isOnline={eq.isOnline}
          />
        )}

        {eq.screen === SCREENS.GAME_END && (
          <EmojiQuizGameEnd
            isOnline={eq.isOnline}
            pScore={eq.pScore}
            oScore={eq.oScore}
            pName={eq.pName}
            oName={eq.oName}
            pColor={eq.pColor}
            oColor={eq.oColor}
            players={eq.players}
            eqScores={eq.eqScores}
            roundLog={eq.roundLog}
            isHost={eq.isHost}
            onReplay={eq.isOnline ? handleReplay : eq.startGame}
            onChangeGame={handleChangeGame}
          />
        )}
      </div>
    </div>
  )
}

export default EmojiQuiz
