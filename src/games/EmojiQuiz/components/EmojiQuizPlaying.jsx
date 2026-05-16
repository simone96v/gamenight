// Schermata di gioco: score cards, timer, emoji puzzle, input guess, indizio.
// Riceve tutto come props — niente stato locale qui (lo gestisce useEmojiQuiz).

import BlobAvatar from './BlobAvatar'
import { TOTAL_ROUNDS } from '../config'

const ScoreCard = ({ name, score, color, side, combo, thinking }) => (
  <div className={`eq-score-card ${side}`}>
    <BlobAvatar color={color} size={38} />
    <div className="eq-sc-text">
      <div className="eq-sc-name">
        {name}
        {combo && <span className="eq-combo-flame">🔥</span>}
      </div>
      <div className="eq-sc-num">{score}</div>
    </div>
    {thinking && (
      <div className="eq-thinking" aria-hidden>
        <i /><i /><i />
      </div>
    )}
  </div>
)

const EmojiQuizPlaying = ({
  puzzle,
  roundIdx,
  pScore,
  oScore,
  pName = 'Tu',
  oName = 'Blobby',
  pColor = 'var(--eq-lime)',
  oColor = 'var(--eq-pink)',
  playerCombo,
  oppCombo,
  oppThinking = true,
  timePct,
  timeLeft,
  guess,
  setGuess,
  submitGuess,
  hint,
  useHint,
  redFlash,
  inputRef,
  inputWrapRef,
  disabled = false,
}) => {
  const low = timePct < 22
  const barColor = timePct > 50 ? 'var(--eq-lime)' : timePct > 22 ? 'var(--eq-yellow)' : 'var(--eq-danger)'

  return (
    <div className="eq-screen eq-play">
      <div className="eq-round-tag">ROUND {roundIdx + 1} / {TOTAL_ROUNDS}</div>

      <div className="eq-scores">
        <ScoreCard name={pName} score={pScore} color={pColor} side="left" combo={playerCombo} />
        <div className="eq-vs-badge">VS</div>
        <ScoreCard name={oName} score={oScore} color={oColor} side="right" combo={oppCombo} thinking={oppThinking} />
      </div>

      <div className="eq-timer-track">
        <div
          className={`eq-timer-fill ${low ? 'low' : ''}`}
          style={{ width: `${timePct}%`, background: barColor }}
        />
        <span className="eq-timer-num">{Math.ceil(timeLeft / 1000)}s</span>
      </div>

      <div className={`eq-cat-badge ${puzzle.category === 'Film' ? 'film' : 'song'}`}>
        {puzzle.category === 'Film' ? '🎬 FILM' : '🎵 CANZONE'}
      </div>

      <div className="eq-emoji-stage">
        <div className="eq-emoji-blob" />
        <div className="eq-emoji-puzzle" key={puzzle.id}>{puzzle.emoji}</div>
      </div>

      {hint && (
        <div className="eq-hint-box">
          <b>Indizio:</b> {puzzle.hint}
        </div>
      )}

      <div className={`eq-input-wrap ${redFlash ? 'wrong' : ''}`} ref={inputWrapRef}>
        <input
          ref={inputRef}
          className="eq-guess-input"
          value={guess}
          placeholder="Scrivi il titolo…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          disabled={disabled}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitGuess() }}
        />
        <button className="eq-guess-btn" onClick={submitGuess} disabled={disabled}>Indovina</button>
      </div>

      <button
        className={`eq-hint-btn ${hint ? 'used' : ''}`}
        onClick={useHint}
        disabled={hint || disabled}
      >
        {hint ? 'Indizio usato · punti ridotti' : '💡 Usa un indizio (−punti)'}
      </button>
    </div>
  )
}

export default EmojiQuizPlaying
