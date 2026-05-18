import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../../../components/ui/Button'
import IconButton from '../../../components/ui/IconButton'
import GradientTitle from '../../../components/ui/GradientTitle'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'
import { useFlappyBlobLeaderboard } from '../useFlappyBlobLeaderboard'

const accentText = (accent) => `color-mix(in srgb, ${accent} 55%, var(--text))`
const SPRING = { type: 'spring', stiffness: 320, damping: 26 }
const MEDAL = { 1: '#F59E0B', 2: '#71717A', 3: '#B45309' }

const Row = ({ rank, name, score, color, isMe, accent, expr }) => {
  const medalColor = MEDAL[rank] ?? 'var(--muted)'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '38px 36px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2vw, 14px)',
        borderRadius: 'var(--radius-sm)',
        background: isMe ? `color-mix(in srgb, ${accent} 12%, var(--surface))` : 'var(--surface)',
        border: isMe ? `1.5px solid ${accent}` : '1px solid var(--border)',
        boxShadow: isMe ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      <span style={{
        fontFamily: "'Baloo 2', cursive",
        fontWeight: 900,
        fontSize: 'clamp(15px, 2dvh, 18px)',
        color: medalColor,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {rank ? `${rank}` : '—'}
      </span>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MiniBlob color={color || '#9CA3AF'} expr={isMe ? expr : 'normal'} size={28} id={`fb-lb-${rank}-${name}`} />
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
        {score}<span style={{ fontSize: '0.65em', color: 'var(--muted)', marginLeft: 3 }}>pt</span>
      </span>
    </div>
  )
}

const FlappyBlobLeaderboard = ({ open, onClose }) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()
  const { top, me, deviceId, loading, refresh } = useFlappyBlobLeaderboard({ enabled: open })

  const inTop = useMemo(
    () => top.some((row) => row.device_id === deviceId),
    [top, deviceId],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="fb-lb-overlay"
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <GradientTitle as="h2" size="md" gradient={C.gradient}>
                  🏆 Classifica globale
                </GradientTitle>
                <p style={{
                  margin: '2px 0 0',
                  color: 'var(--muted)',
                  fontSize: 'clamp(11px, 1.4dvh, 13px)',
                  fontWeight: 600,
                }}>
                  Flappy Blob · best score per giocatore
                </p>
              </div>
              <IconButton ariaLabel="Chiudi classifica" onClick={onClose} size="md">✕</IconButton>
            </div>

            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'clamp(12px, 1.8dvh, 16px) clamp(14px, 2.5vw, 18px)',
                background: `color-mix(in srgb, ${C.accent} 14%, var(--surface))`,
                color: 'var(--text)',
                border: `1.5px solid ${C.accent}`,
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{
                  fontSize: 'clamp(11px, 1.3dvh, 13px)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: accentText(C.accent),
                }}>
                  La tua posizione
                </span>
                <span style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontWeight: 900,
                  fontSize: 'clamp(20px, 2.8dvh, 24px)',
                  color: accentText(C.accent),
                }}>
                  {loading
                    ? '...'
                    : me.rank
                    ? `#${me.rank} su ${me.total}`
                    : 'Nessuno score'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 'clamp(11px, 1.3dvh, 13px)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: accentText(C.accent),
                }}>
                  Record
                </span>
                <div style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontWeight: 900,
                  fontSize: 'clamp(22px, 3dvh, 28px)',
                  lineHeight: 1.1,
                  color: accentText(C.accent),
                }}>
                  {me.score ?? 0}
                  <span style={{ fontSize: '0.55em', marginLeft: 4, opacity: 0.7 }}>pt</span>
                </div>
              </div>
            </motion.div>

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
                    name={row.display_name || row.player_name}
                    score={row.score}
                    color={row.profile_blob_color || row.color}
                    isMe={row.device_id === deviceId}
                    accent={C.accent}
                    expr={expr}
                  />
                ))
              )}

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
                    accent={C.accent}
                    expr={expr}
                  />
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" width="full" onClick={refresh}>Aggiorna</Button>
              <Button variant="primary" width="full" onClick={onClose} style={accentBtnStyle(C.accent)}>
                Chiudi
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FlappyBlobLeaderboard
