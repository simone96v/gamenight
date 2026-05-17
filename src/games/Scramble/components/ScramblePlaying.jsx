// Schermata di gioco di Scramble:
// AppHeader + GameHUD + vassoio parola + griglia 7 tessere + azioni + lista parole.

import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import GameHUD from '../../../components/GameHUD'
import { accentBtnStyle, SPRING } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { scoreWord } from '../data/dictionary'

const RACK_LEN = 7

const ScramblePlaying = ({
  rack,
  shuffledRack,
  tray,
  currentWord,
  usedSet,
  myWords,
  scrambleWords,
  scrambleWordCounts,
  players,
  localPlayerId,
  roundIdx,
  totalRounds,
  timeLeft,
  roundDuration,
  isExpired,
  dictLoading,
  errorFlash,
  onTapTile,
  onBackspace,
  onClearTray,
  onReshuffle,
  onSubmit,
  onExit,
}) => {
  const C = usePlayerAccent()
  const myScore = myWords.reduce((acc, w) => acc + scoreWord(w, RACK_LEN), 0)
  // Sovrascrive score con il conteggio parole del round corrente (live).
  const hudPlayers = players.map((p) => ({
    ...p,
    score: p.id === localPlayerId
      ? myWords.length
      : (scrambleWordCounts?.[p.id] ?? scrambleWords?.[p.id]?.length ?? 0),
  }))

  const canSubmit = !isExpired && tray.length >= 3 && !dictLoading

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
      />

      <GameHUD
        questionNumber={roundIdx + 1}
        totalQuestions={totalRounds}
        timeLeft={timeLeft}
        total={roundDuration}
        players={hudPlayers}
        localPlayerId={localPlayerId}
        phase="question"
        accentColor={C.accent}
      />

      <div style={S.body}>
        {/* Istruzioni in alto (box col colore del giocatore) */}
        <div
          style={{
            ...S.instructionsBox,
            background: `${C.accent}14`,
            borderColor: `${C.accent}40`,
          }}
        >
          <span style={{ ...S.instructionsIcon, color: C.accent }}>💡</span>
          <p style={{ ...S.instructions, color: 'var(--text)' }}>
            Tocca le tessere <strong style={{ color: C.accent }}>in ordine</strong> per comporre parole italiane, poi premi <strong style={{ color: C.accent }}>Invia</strong>.
          </p>
        </div>

        {/* Area input in alto: vassoio + tessere + azioni (più visibile mentre si compone) */}
        <div style={S.inputArea}>
          {/* Vassoio della parola in costruzione (con bottone refresh per cancellare tutto) */}
          <div style={S.trayWrap}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                x: errorFlash ? [0, -8, 8, -6, 6, 0] : 0,
              }}
              transition={errorFlash ? { duration: 0.4 } : SPRING}
              style={{
                ...S.tray,
                borderColor: errorFlash ? 'var(--danger)' : 'var(--border)',
              }}
            >
              {Array.from({ length: RACK_LEN }).map((_, i) => {
                const idx = tray[i]
                const ch = idx != null ? shuffledRack[idx] : ''
                return (
                  <div
                    key={i}
                    style={{
                      ...S.traySlot,
                      background: ch ? C.accent : 'transparent',
                      color: ch ? '#fff' : 'var(--muted)',
                      borderColor: ch ? C.accent : 'var(--border)',
                    }}
                  >
                    {ch}
                  </div>
                )
              })}
            </motion.div>
            <AnimatePresence>
              {tray.length > 0 && !isExpired && (
                <motion.button
                  key="tray-clear"
                  type="button"
                  onClick={onClearTray}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  whileHover={{ scale: 1.1, rotate: -30 }}
                  whileTap={{ scale: 0.9 }}
                  transition={SPRING}
                  style={{ ...S.trayClearBtn, color: C.accent, borderColor: C.accent }}
                  aria-label="Cancella lettere"
                >
                  ↺
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {errorFlash && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={S.errorMsg}
            >
              {errorFlash === 'duplicate' && 'Già trovata!'}
              {errorFlash === 'invalid' && 'Parola non valida'}
              {errorFlash === 'too_short' && 'Minimo 3 lettere'}
            </motion.p>
          )}

          {/* Griglia tessere */}
          <div style={S.tilesGrid}>
            {shuffledRack.split('').map((ch, i) => {
              const used = usedSet.has(i)
              return (
                <motion.button
                  key={`${i}-${ch}`}
                  type="button"
                  disabled={used || isExpired}
                  onClick={() => onTapTile(i)}
                  whileHover={used || isExpired ? undefined : { y: -3, scale: 1.04 }}
                  whileTap={used || isExpired ? undefined : { scale: 0.93 }}
                  transition={SPRING}
                  style={{
                    ...S.tile,
                    background: used ? 'var(--surface2)' : 'var(--surface)',
                    color: used ? 'var(--muted)' : 'var(--text)',
                    borderColor: used ? 'var(--border)' : C.accent,
                    borderWidth: used ? '1.5px' : '2px',
                    opacity: used ? 0.4 : 1,
                    cursor: used || isExpired ? 'default' : 'pointer',
                    boxShadow: used ? 'none' : 'var(--shadow-sm)',
                  }}
                >
                  {ch}
                </motion.button>
              )
            })}
          </div>

          {/* Azioni */}
          <div style={S.actions}>
            <motion.button
              type="button"
              onClick={onReshuffle}
              disabled={isExpired}
              whileHover={isExpired ? undefined : { scale: 1.05, rotate: 90 }}
              whileTap={isExpired ? undefined : { scale: 0.95 }}
              transition={SPRING}
              style={{ ...S.actionBtn, opacity: isExpired ? 0.4 : 1, color: 'var(--text)' }}
              aria-label="Mescola"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 3h5v5" />
                <path d="M4 20 21 3" />
                <path d="M21 16v5h-5" />
                <path d="m15 15 6 6" />
                <path d="M4 4l5 5" />
              </svg>
            </motion.button>
            <motion.button
              type="button"
              onClick={tray.length > 0 ? (tray.length === 1 ? onBackspace : onClearTray) : undefined}
              onContextMenu={(e) => { e.preventDefault(); onClearTray() }}
              disabled={isExpired || tray.length === 0}
              whileHover={isExpired || tray.length === 0 ? undefined : { scale: 1.05 }}
              whileTap={isExpired || tray.length === 0 ? undefined : { scale: 0.95 }}
              transition={SPRING}
              style={{ ...S.actionBtn, opacity: isExpired || tray.length === 0 ? 0.4 : 1 }}
              aria-label="Cancella"
            >
              ⌫
            </motion.button>
            <Button
              variant="primary"
              onClick={onSubmit}
              disabled={!canSubmit}
              style={canSubmit ? { ...accentBtnStyle(C.accent), flex: 1 } : { flex: 1 }}
            >
              {dictLoading ? 'Caricamento...' : 'Invia'}
            </Button>
          </div>
        </div>

        {/* Header lista parole */}
        <div style={S.listHeader}>
          <span style={S.listTitle}>Parole trovate</span>
          <span style={{ ...S.listScore, color: C.accent }}>
            {myWords.length} · {myScore} pt
          </span>
        </div>

        {/* Lista parole (scrollable, occupa lo spazio rimanente in basso) */}
        <div className="scrollable-list" style={S.wordsList}>
          {myWords.length === 0 ? (
            <p style={S.empty}>Nessuna parola ancora.</p>
          ) : (
            <AnimatePresence initial={false}>
              {[...myWords].reverse().map((w) => {
                const pts = scoreWord(w, RACK_LEN)
                const isPangram = w.length === RACK_LEN
                return (
                  <motion.div
                    key={w}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING}
                    style={{
                      ...S.wordRow,
                      ...(isPangram ? { borderColor: C.accent, background: `${C.accent}1a` } : {}),
                    }}
                  >
                    <span style={S.wordText}>{w}</span>
                    {isPangram && <span style={{ ...S.pangramBadge, color: C.accent }}>PANGRAM!</span>}
                    <span style={{ ...S.wordPts, color: isPangram ? C.accent : 'var(--text)' }}>
                      +{pts}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(8px, 1.4dvh, 14px) clamp(12px, 4vw, 24px)',
    gap: 'clamp(4px, 0.8dvh, 8px)',
    overflow: 'hidden',
    minHeight: 0,
  },
  instructionsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.6vw, 12px)',
    padding: 'clamp(8px, 1.4dvh, 12px) clamp(12px, 3vw, 18px)',
    border: '1.5px solid',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  },
  instructionsIcon: {
    fontSize: 'clamp(18px, 2.6dvh, 22px)',
    lineHeight: 1,
    flexShrink: 0,
  },
  instructions: {
    margin: 0,
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
    flexShrink: 0,
  },
  trayWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  tray: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'clamp(4px, 1vw, 8px)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'clamp(8px, 1.4dvh, 12px) clamp(56px, 13vw, 68px) clamp(8px, 1.4dvh, 12px) clamp(8px, 2vw, 12px)',
    boxShadow: 'var(--shadow-sm)',
    flexShrink: 0,
  },
  trayClearBtn: {
    position: 'absolute',
    right: 'clamp(14px, 3.5vw, 22px)',
    bottom: 'clamp(14px, 3dvh, 22px)',
    width: 'clamp(28px, 6.5vw, 34px)',
    height: 'clamp(28px, 6.5vw, 34px)',
    borderRadius: '50%',
    border: '1.5px solid var(--border-strong)',
    background: 'var(--surface)',
    fontSize: 'clamp(16px, 2.2dvh, 20px)',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    padding: 0,
    lineHeight: 1,
  },
  traySlot: {
    width: 'clamp(30px, 8.4vw, 42px)',
    height: 'clamp(38px, 9.2vw, 50px)',
    borderRadius: 12,
    border: '1.5px dashed var(--border-strong)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(18px, 4.6vw, 26px)',
    fontWeight: 900,
    letterSpacing: '-0.02em',
  },
  errorMsg: {
    margin: 0,
    textAlign: 'center',
    color: 'var(--danger)',
    fontWeight: 700,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    flexShrink: 0,
  },
  tilesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 'clamp(4px, 1vw, 8px)',
    flexShrink: 0,
  },
  tile: {
    aspectRatio: '1 / 1.1',
    border: '2px solid',
    borderRadius: 12,
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(22px, 5.4vw, 32px)',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    touchAction: 'manipulation',
    padding: 0,
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'stretch',
    flexShrink: 0,
  },
  actionBtn: {
    width: 'clamp(42px, 11vw, 50px)',
    height: 'clamp(42px, 11vw, 50px)',
    background: 'var(--surface)',
    border: '1.5px solid var(--border-strong)',
    borderRadius: 12,
    fontSize: 'clamp(16px, 2.2dvh, 20px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text)',
    boxShadow: 'var(--shadow-sm)',
    flexShrink: 0,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  listTitle: {
    fontSize: 'clamp(13px, 1.5dvh, 15px)',
    fontWeight: 800,
    color: 'var(--text)',
  },
  listScore: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  wordsList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'clamp(6px, 1dvh, 10px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.6dvh, 6px)',
  },
  empty: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    textAlign: 'center',
    padding: 'clamp(8px, 1.5dvh, 14px) 8px',
    lineHeight: 1.4,
  },
  wordRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(12px, 3vw, 16px)',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 12,
  },
  wordText: {
    flex: 1,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 900,
    fontSize: 'clamp(13px, 1.7dvh, 17px)',
    color: 'var(--text)',
    letterSpacing: '0.08em',
  },
  pangramBadge: {
    fontSize: 'clamp(9px, 1.1dvh, 11px)',
    fontWeight: 900,
    letterSpacing: '0.06em',
  },
  wordPts: {
    fontWeight: 900,
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 32,
    textAlign: 'right',
  },
}

export default ScramblePlaying
