// HUD bar shown during gameplay.
// Stile: card bianca + round badge tondo + timer ring + griglia mini-blob.
// Estende automaticamente lo stile a tutti i giochi che lo importano.

import { motion } from 'framer-motion'
import MiniBlob, { useMiniExpr } from './MiniBlob'

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

const formatTimer = (s) => {
  const sec = Math.max(0, Math.floor(s ?? 0))
  const m = Math.floor(sec / 60)
  const r = sec % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const GameHUD = ({
  questionNumber,
  totalQuestions,
  timeLeft,
  total,
  players,
  localPlayerId,
  phase,
  accentColor,
  showTimer: showTimerProp,
  scoreSuffix = '',
}) => {
  const showTimer = showTimerProp ?? (phase === 'question')
  const urgent = showTimer && (timeLeft ?? 0) <= 5
  const accent = accentColor || 'var(--accent)'
  const fraction = showTimer && total > 0
    ? Math.max(0, Math.min(1, (timeLeft ?? 0) / total))
    : 0
  const ringColor = urgent ? 'var(--danger)' : accent
  const localExpr = useMiniExpr()

  // Ordina per punteggio decrescente; cap a 8 blob.
  const sorted = [...(players ?? [])]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8)
  const cols = sorted.length <= 2 ? sorted.length
    : sorted.length <= 4 ? 2
      : sorted.length <= 6 ? 3
        : 4
  const blobSize = sorted.length <= 4 ? 36 : 30

  return (
    <div style={S.outer}>
      <div style={S.card}>
        <div style={{ ...S.roundBadge, background: accent }}>
          {questionNumber}/{totalQuestions}
        </div>

        {showTimer && (
          <div style={S.timerWrap}>
            <svg width="100%" height="100%" viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r={RING_R} fill="none" stroke="var(--surface2)" strokeWidth="4" />
              <motion.circle
                cx="30" cy="30" r={RING_R}
                fill="none"
                stroke={ringColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                animate={{ strokeDashoffset: RING_C * (1 - fraction) }}
                transition={{ duration: 0.3 }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <motion.span
              style={{
                ...S.timerText,
                color: urgent ? 'var(--danger)' : 'var(--text)',
              }}
              animate={urgent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={urgent ? { repeat: Infinity, duration: 0.8 } : {}}
            >
              {formatTimer(timeLeft)}
            </motion.span>
          </div>
        )}

        <div
          style={{
            ...S.blobGrid,
            gridTemplateColumns: `repeat(${cols}, auto)`,
          }}
        >
          {sorted.map((p) => {
            const isLocal = p.id === localPlayerId
            const score = p.score ?? 0
            return (
              <div
                key={p.id}
                style={{
                  ...S.blobCell,
                  borderColor: isLocal ? accent : 'transparent',
                }}
                title={`${p.name ?? ''} · ${score}${scoreSuffix}`}
              >
                <MiniBlob
                  color={p.color}
                  expr={isLocal ? localExpr : 'normal'}
                  size={blobSize}
                  id={`hud-${p.id}`}
                />
                <span style={S.blobScore}>
                  {score}{scoreSuffix}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const S = {
  outer: {
    padding: 'clamp(8px, 1.4dvh, 14px) clamp(12px, 4vw, 24px) 0',
    flexShrink: 0,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 2.4vw, 16px)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: 'clamp(10px, 1.6dvh, 14px) clamp(12px, 3vw, 16px)',
  },
  roundBadge: {
    width: 'clamp(44px, 11vw, 56px)',
    height: 'clamp(44px, 11vw, 56px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(14px, 1.9dvh, 18px)',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
  },
  timerWrap: {
    position: 'relative',
    width: 'clamp(56px, 13vw, 68px)',
    height: 'clamp(56px, 13vw, 68px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerText: {
    position: 'absolute',
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(13px, 1.7dvh, 16px)',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  blobGrid: {
    flex: 1,
    display: 'grid',
    gridAutoRows: 'min-content',
    gap: 'clamp(4px, 1vw, 8px)',
    justifyContent: 'end',
    justifyItems: 'center',
  },
  blobCell: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: '50%',
    border: '2px solid transparent',
  },
  blobScore: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 8,
    background: 'var(--surface)',
    border: '1.5px solid var(--border-strong)',
    fontSize: 10,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
}

export default GameHUD
