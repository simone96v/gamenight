// Fase question di Emoji Quiz: AppHeader + GameHUD + emoji card + hint box (se attivo)
// + input testuale con bottone Indovina + bottone "Usa indizio (-punti)".
//
// Il bottone hint cappa i punti massimi a 350 (vs 800 senza). Una volta usato per
// il round, resta consumato e mostra il testo dell'indizio.

import { AnimatePresence, motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import GameHUD from '../../../components/GameHUD'
import IconButton from '../../../components/ui/IconButton'
import RoundBadge from '../../../components/ui/RoundBadge'
import EmojiQuizCard from './EmojiQuizCard'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const EmojiQuizQuestionPhase = ({
  puzzle,
  roundIdx,
  totalRounds,
  timeLeft,
  timerDuration,
  players,
  localPlayerId,
  guess,
  setGuess,
  wrongFlash,
  submitted,
  hintUsed,
  inputRef,
  inputWrapRef,
  isExpired,
  isHost,
  eqScores,
  onSubmit,
  onUseHint,
  onExit,
}) => {
  const C = usePlayerAccent()
  const disabled = submitted || isExpired
  const playersForHud = (players ?? []).map((p) => ({ ...p, score: eqScores?.[p.id] ?? 0 }))

  return (
    <div style={containerStyle}>
      <AppHeader
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={roundIdx + 1} total={totalRounds} accentColor={C.accent} />}
      />
      <GameHUD
        questionNumber={roundIdx + 1}
        totalQuestions={totalRounds}
        timeLeft={timeLeft}
        total={timerDuration}
        players={playersForHud}
        localPlayerId={localPlayerId}
        phase="question"
        accentColor={C.accent}
      />

      <div style={bodyStyle}>
        <EmojiQuizCard puzzle={puzzle} />

        {/* Hint box (visibile solo se l'hint è stato usato) */}
        <AnimatePresence>
          {hintUsed && puzzle?.hint && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={hintBoxStyle}
            >
              <span style={hintLabelStyle}>💡 Indizio</span>
              <span style={hintTextStyle}>{puzzle.hint}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          ref={inputWrapRef}
          style={{
            ...inputWrapStyle,
            borderColor: wrongFlash ? 'var(--danger)' : 'var(--border)',
            background: wrongFlash ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface)',
          }}
        >
          <input
            ref={inputRef}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
            placeholder={submitted ? '✓ Indovinato!' : (isExpired ? 'Tempo scaduto' : 'Scrivi il titolo…')}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            disabled={disabled}
            style={inputStyle}
          />
          <motion.button
            type="button"
            whileHover={!disabled && guess.trim() ? { y: -2 } : {}}
            whileTap={!disabled && guess.trim() ? { y: 1, scale: 0.97 } : {}}
            onClick={onSubmit}
            disabled={disabled || !guess.trim()}
            style={{
              ...guessBtnStyle,
              ...accentBtnStyle(C.accent),
              opacity: disabled || !guess.trim() ? 0.5 : 1,
              cursor: disabled || !guess.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Indovina
          </motion.button>
        </div>

        {/* Hint button — usa punti per avere un indizio */}
        <motion.button
          type="button"
          whileHover={!hintUsed && !disabled ? { y: -1 } : {}}
          whileTap={!hintUsed && !disabled ? { y: 1, scale: 0.98 } : {}}
          onClick={onUseHint}
          disabled={hintUsed || disabled}
          style={{
            ...hintBtnStyle,
            opacity: hintUsed || disabled ? 0.6 : 1,
            cursor: hintUsed || disabled ? 'default' : 'pointer',
            borderColor: hintUsed ? 'var(--warning)' : 'var(--border)',
            color: hintUsed ? 'var(--warning)' : 'var(--muted)',
            background: hintUsed ? 'rgba(245, 158, 11, 0.10)' : 'var(--surface)',
          }}
        >
          {hintUsed ? '💡 Indizio usato · punti ridotti' : '💡 Usa un indizio (−punti)'}
        </motion.button>

        {/* Status row */}
        <div style={statusRowStyle}>
          <AnimatePresence mode="wait">
            {submitted && (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ ...statusTextStyle, color: 'var(--success)' }}
              >
                ✓ Risposta bloccata — aspettando gli altri
              </motion.p>
            )}
            {!submitted && isExpired && (
              <motion.p
                key="exp"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                style={{ ...statusTextStyle, color: 'var(--danger)' }}
              >
                Tempo scaduto! 🐌
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative',
}
const bodyStyle = {
  display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center',
  padding: 'clamp(10px, 1.8dvh, 18px) clamp(14px, 3vw, 22px)',
  gap: 'clamp(8px, 1.2dvh, 12px)',
  overflow: 'hidden',
}
const hintBoxStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: 'clamp(10px, 1.4dvh, 14px) clamp(12px, 2.5vw, 16px)',
  background: 'rgba(245, 158, 11, 0.08)',
  border: '1px dashed rgba(245, 158, 11, 0.45)',
  borderRadius: 'var(--radius-sm)',
  flexShrink: 0,
}
const hintLabelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  fontWeight: 800,
  color: 'var(--warning)',
  letterSpacing: '0.02em',
  flexShrink: 0,
}
const hintTextStyle = {
  fontSize: 'clamp(13px, 1.6dvh, 15px)',
  color: 'var(--text)',
  fontWeight: 500,
  lineHeight: 1.35,
}
const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: 5,
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  transition: 'border-color 0.15s, background 0.15s',
  flexShrink: 0,
  boxShadow: 'var(--shadow-sm)',
}
const inputStyle = {
  flex: 1,
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 'clamp(15px, 1.8dvh, 18px)',
  fontWeight: 500,
  padding: '10px 12px',
}
const guessBtnStyle = {
  flexShrink: 0,
  height: 'clamp(40px, 5.5dvh, 48px)',
  padding: '0 clamp(14px, 3vw, 22px)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  fontFamily: 'inherit',
  fontSize: 'clamp(14px, 1.7dvh, 16px)',
  fontWeight: 800,
  letterSpacing: '0.01em',
  transition: 'opacity 0.15s, transform 0.12s',
}
const hintBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: 'clamp(9px, 1.3dvh, 12px) clamp(12px, 2.5vw, 18px)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'inherit',
  fontSize: 'clamp(13px, 1.55dvh, 15px)',
  fontWeight: 600,
  color: 'var(--muted)',
  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
  flexShrink: 0,
}
const statusRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 'clamp(28px, 4dvh, 36px)',
  flexShrink: 0,
}
const statusTextStyle = {
  margin: 0,
  fontSize: 'clamp(13px, 1.55dvh, 15px)',
  textAlign: 'center',
  fontWeight: 700,
}

export default EmojiQuizQuestionPhase
