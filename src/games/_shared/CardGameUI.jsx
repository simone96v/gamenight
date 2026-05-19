// Componenti UI condivisi per i tavoli dei giochi di carte.
// Pattern: top strip con PlayerCard + pannello info, status row, animated
// ScoreNumber, HelpModal con regole specifiche per gioco.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MiniBlob from '../../components/MiniBlob'
import CardView from '../../lib/cards/CardView'

// ── ScoreNumber: numero score con pulse-scale animato su ogni cambio ──

export const ScoreNumber = ({ value, accent, size = 22 }) => (
  <motion.span
    key={value}
    initial={{ scale: 1.4, opacity: 0.6 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 340, damping: 20 }}
    style={{
      fontFamily: "'Baloo 2', cursive",
      fontWeight: 900,
      fontSize: size,
      color: accent || 'var(--text)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em',
      marginLeft: 'auto',
    }}
  >
    {value}
  </motion.span>
)

// ── PlayerCard: chip con avatar + nome + sub + score ──

export const PlayerCard = ({
  color,
  name,
  sub,
  score,
  accent,
  id = 'pc',
  size = 28,
  showScore = true,
  active = false,
  flex = false,
}) => (
  <div
    style={{
      flex: flex ? 1 : undefined,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: 'var(--surface)',
      border: active
        ? `1.5px solid ${accent || 'var(--text)'}`
        : '1px solid var(--border)',
      borderRadius: 12,
      boxShadow: active
        ? `0 2px 12px color-mix(in srgb, ${accent || 'var(--text)'} 25%, transparent)`
        : '0 2px 6px rgba(0,0,0,0.04)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      flexShrink: 0,
    }}
  >
    <MiniBlob color={color} size={size} id={id} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
      <span style={{
        fontFamily: "'Baloo 2', cursive",
        fontWeight: 800,
        fontSize: 13,
        color: 'var(--text)',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{name}</span>
      {sub && (
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--muted)',
          letterSpacing: '0.02em',
        }}>{sub}</span>
      )}
    </div>
    {showScore && <ScoreNumber value={score} accent={accent} />}
  </div>
)

// ── HelpModal: overlay con regole, contenuto via children ──

export const HelpModal = ({ open, onClose, title, emoji, children }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              padding: 24,
              borderRadius: 18,
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
            }}
          >
            <h2 style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: 22,
              margin: '0 0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {emoji && <span>{emoji}</span>}
              {title}
            </h2>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</div>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 18,
                width: '100%',
                height: 44,
                background: 'var(--text)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 10,
                fontFamily: "'Baloo 2', cursive",
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Ho capito
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── BriscolaPanel: pannello che mostra la briscola + deck count ──

export const BriscolaPanel = ({ card, deckCount }) => {
  if (!card) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: 'var(--surface)',
      border: '1.5px solid var(--text)',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>Briscola</span>
      <CardView card={card} size="xs" />
      {deckCount > 0 && (
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--muted)',
          fontVariantNumeric: 'tabular-nums',
        }}>🂠 {deckCount}</span>
      )}
    </div>
  )
}

// ── StatusBar: messaggio di stato con accent dinamico ──

export const StatusBar = ({ text, accent, dim = false }) => (
  <div style={{
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    minHeight: 24,
  }}>
    <span style={{
      fontFamily: "'Baloo 2', cursive",
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '0.01em',
      color: dim ? 'var(--muted)' : (accent || 'var(--text)'),
    }}>
      {text}
    </span>
  </div>
)
