// BlobJumpLeaderboard — overlay fullscreen della classifica globale.
// Mostra top 20 + posizione del device locale (anche se fuori dalla top).
// Highlight della riga del giocatore corrente. Refresh manuale + automatico on mount.

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../../../components/ui/Button'
import IconButton from '../../../components/ui/IconButton'
import MiniBlob from '../../../components/MiniBlob'
import { useBlobJumpLeaderboard } from '../useBlobJumpLeaderboard'

const SPRING = { type: 'spring', stiffness: 320, damping: 26 }

const Row = ({ rank, name, score, color, isMe, isHighlight }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '38px 36px 1fr auto',
      alignItems: 'center',
      gap: 10,
      padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2vw, 14px)',
      borderRadius: 14,
      background: isMe ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))' : 'var(--surface)',
      border: isMe ? '1.5px solid var(--accent)' : '1px solid var(--border)',
      boxShadow: isHighlight ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    }}
  >
    <span style={{
      fontFamily: "'Baloo 2', cursive",
      fontWeight: 800,
      fontSize: 'clamp(15px, 2dvh, 18px)',
      color: rank === 1 ? '#F59E0B' : rank === 2 ? '#A1A1AA' : rank === 3 ? '#CA8A04' : 'var(--muted)',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {rank ? `${rank}` : '—'}
    </span>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <MiniBlob color={color || '#9CA3AF'} expr="normal" size={28} id={`lb-${rank}-${name}`} />
    </div>
    <span style={{
      fontWeight: 700,
      fontSize: 'clamp(13px, 1.7dvh, 15px)',
      color: 'var(--text)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {name}{isMe ? ' (tu)' : ''}
    </span>
    <span style={{
      fontFamily: "'Baloo 2', cursive",
      fontWeight: 900,
      fontSize: 'clamp(15px, 2.1dvh, 18px)',
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {score}<span style={{ fontSize: '0.65em', color: 'var(--muted)', marginLeft: 3 }}>m</span>
    </span>
  </div>
)

const BlobJumpLeaderboard = ({ open, onClose, highlightedScore = null }) => {
  const { top, me, deviceId, loading, refresh } = useBlobJumpLeaderboard({ enabled: open })

  const inTop = useMemo(
    () => top.some((row) => row.device_id === deviceId),
    [top, deviceId],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lb-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
            backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'stretch',
          }}
        >
          <motion.div
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={SPRING}
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              padding: 'clamp(12px, 2.5dvh, 22px) clamp(16px, 4vw, 24px)',
              gap: 'clamp(10px, 1.6dvh, 16px)',
              minHeight: 0,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontFamily: "'Baloo 2', cursive",
                  fontWeight: 800,
                  fontSize: 'clamp(20px, 3dvh, 26px)',
                  letterSpacing: '-0.01em',
                  color: 'var(--text)',
                }}>
                  🏆 Classifica globale
                </h2>
                <p style={{
                  margin: '2px 0 0',
                  color: 'var(--muted)',
                  fontSize: 'clamp(11px, 1.4dvh, 13px)',
                  fontWeight: 600,
                }}>
                  Blob Jump · best score per giocatore
                </p>
              </div>
              <IconButton ariaLabel="Chiudi classifica" onClick={onClose} size="md">✕</IconButton>
            </div>

            {/* Tua posizione */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'clamp(10px, 1.6dvh, 14px) clamp(12px, 2vw, 16px)',
                background: 'var(--accent)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 'clamp(11px, 1.3dvh, 13px)', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  La tua posizione
                </span>
                <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 900, fontSize: 'clamp(20px, 2.8dvh, 24px)' }}>
                  {loading
                    ? '...'
                    : me.rank
                    ? `#${me.rank} su ${me.total}`
                    : 'Nessuno score'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'clamp(11px, 1.3dvh, 13px)', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Record
                </span>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 900, fontSize: 'clamp(22px, 3dvh, 28px)', lineHeight: 1.1 }}>
                  {me.score ?? 0}
                  <span style={{ fontSize: '0.55em', marginLeft: 4, opacity: 0.85 }}>m</span>
                </div>
              </div>
            </motion.div>

            {/* Top */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '4px 2px',
              scrollbarWidth: 'none',
            }}>
              {loading && top.length === 0 ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Caricamento...</div>
              ) : top.length === 0 ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
                  Nessuno score ancora. Sii il primo!
                </div>
              ) : (
                top.map((row, i) => (
                  <Row
                    key={row.device_id}
                    rank={i + 1}
                    name={row.player_name}
                    score={row.score}
                    color={row.color}
                    isMe={row.device_id === deviceId}
                    isHighlight={highlightedScore !== null && row.score === highlightedScore && row.device_id === deviceId}
                  />
                ))
              )}

              {/* Riga "tu fuori dalla top" se non in top */}
              {!loading && me.rank && !inTop && (
                <>
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 12,
                    padding: '6px 0',
                    fontWeight: 600,
                  }}>· · ·</div>
                  <Row
                    rank={me.rank}
                    name="Tu"
                    score={me.score}
                    color={null}
                    isMe={true}
                    isHighlight={true}
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" width="full" onClick={refresh}>Aggiorna</Button>
              <Button variant="primary" width="full" onClick={onClose}>Chiudi</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BlobJumpLeaderboard
