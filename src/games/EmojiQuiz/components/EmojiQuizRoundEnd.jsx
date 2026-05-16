// Schermata fra-round: outcome (win/lose/timeout), risposta, punti, CTA next.
// `result` shape comune local/online (vedi useEmojiQuiz):
//   { outcome, puzzle, pPts, oPts, combo, oCombo, winnerName? }

import Confetti from './Confetti'
import { TOTAL_ROUNDS } from '../config'

const EmojiQuizRoundEnd = ({ result, roundIdx, onNext, oppName = 'Blobby', isOnline = false }) => {
  const { outcome, puzzle, pPts, oPts, combo, oCombo } = result
  const win = outcome === 'win'
  const lose = outcome === 'lose'
  const head = win ? 'Indovinato!' : lose ? 'Troppo lento!' : 'Tempo scaduto!'
  const sub = win
    ? (isOnline ? '⚡ Più veloce di tutti!' : `Più veloce di ${oppName} 🎉`)
    : lose
      ? `${oppName} ha risposto per primo`
      : 'Nessuno l\'ha presa'

  return (
    <div className="eq-screen eq-result">
      {win && <Confetti />}
      <div className={`eq-result-ring ${outcome}`}>
        <span className="eq-result-icon">{win ? '⚡' : lose ? (isOnline ? '🏃' : '🤖') : '⏱️'}</span>
      </div>
      <h2 className={`eq-result-head ${outcome}`}>{head}</h2>
      <p className="eq-result-sub">{sub}</p>

      <div className="eq-answer-card">
        <div className="eq-answer-emoji">{puzzle.emoji}</div>
        <div className="eq-answer-meta">
          <div className="eq-answer-cat">{puzzle.category}</div>
          <div className="eq-answer-title">{puzzle.title}</div>
        </div>
      </div>

      {win && (
        <div className="eq-pts-line you">
          +{pPts} punti
          {combo && <span className="eq-combo-pill">COMBO ×{combo.toFixed(1)}</span>}
        </div>
      )}
      {lose && (
        <div className="eq-pts-line opp">
          {oppName} +{oPts}
          {oCombo && <span className="eq-combo-pill opp">COMBO ×{oCombo.toFixed(1)}</span>}
        </div>
      )}
      {outcome === 'timeout' && <div className="eq-pts-line neutral">Nessun punto</div>}

      {!isOnline && (
        <button className="eq-cta small" onClick={onNext}>
          {roundIdx >= TOTAL_ROUNDS - 1 ? 'Risultato finale' : 'Round successivo'}
        </button>
      )}
      <div className="eq-autonext">{isOnline ? 'Prossimo round…' : 'prosegue da solo…'}</div>
    </div>
  )
}

export default EmojiQuizRoundEnd
