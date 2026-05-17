// Non ho mai — multiplayer sync.
// Host pesca le carte; tutti vedono la stessa via Realtime.
// Back btn host → final screen con Rigioca / Cambia gioco.

import { motion, AnimatePresence } from 'framer-motion'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import AppHeader from '../../components/AppHeader'
import PlayerStripCompact from '../../components/PlayerStripCompact'
import GameFinalScreen from '../../components/GameFinalScreen'
import { useSession } from '../../stores/useSession'
import { rpcUpdateGameState } from '../../lib/room'
import CARDS from '../../data/questions/never-have-i.json'
import { haptic } from '../../utils/haptic'

const REPLAY_PATCH = {
  nhi_card: null,
  nhi_used: [],
  nhi_count: 0,
  nhi_phase: 'idle',
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const NeverHaveI = () => {
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)

  const card = gameState?.nhi_card ?? null
  const used = gameState?.nhi_used ?? []
  const count = gameState?.nhi_count ?? 0
  const phase = gameState?.nhi_phase ?? 'idle'
  const total = CARDS.cards.length

  const handleDraw = async () => {
    if (!isHost) return
    haptic.medium()
    const pool = CARDS.cards
    const available = pool.filter((c) => !used.includes(c))
    const fromPool = available.length > 0 ? available : pool
    const picked = pickRandom(fromPool)
    const newUsed = available.length > 0 ? [...used, picked] : [picked]
    await rpcUpdateGameState(roomCode, localPlayerId, {
      nhi_card: picked,
      nhi_used: newUsed,
      nhi_count: count + 1,
    })
  }

  const handleEnd = async () => {
    if (!isHost) return
    await rpcUpdateGameState(roomCode, localPlayerId, { nhi_phase: 'final' })
  }

  const cardText = card?.replace(/^Non ho mai\s*/i, '') || ''

  return (
    <div style={S.container}>
      <AppHeader
        leading={isHost && (
          <IconButton ariaLabel="Esci" onClick={handleEnd}>←</IconButton>
        )}
        actions={
          <div style={S.counterBadge}>{count}/{total}</div>
        }
      />

      <PlayerStripCompact players={players} />

      {phase === 'final' ? (
        <GameFinalScreen
          emoji="🍻"
          title="Cin cin!"
          subtitle={`${count} carte pescate. Ne facciamo un'altra o cambiamo gioco?`}
          replayPatch={REPLAY_PATCH}
        />
      ) : (
        <>
          <div style={S.body}>
            <div style={S.deckWrap}>
              <div style={{ ...S.ghostCard, transform: 'translate(8px, 10px) rotate(2.5deg)' }} />
              <div style={{ ...S.ghostCard, transform: 'translate(-6px, 6px) rotate(-1.5deg)', opacity: 0.6 }} />

              <AnimatePresence mode="wait">
                {card ? (
                  <motion.div
                    key={card}
                    initial={{ opacity: 0, y: 30, rotateY: 90, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, rotateY: -90, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                    style={S.card}
                  >
                    <div style={S.cardCorner}><span style={S.cornerEmoji}>🍻</span></div>
                    <div style={S.cardLabel}>NON HO MAI</div>
                    <div style={S.cardText}>{cardText}</div>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={S.cardHint}
                    >
                      <span style={{ fontSize: 18 }}>🍺</span>
                      <span>Chi l'ha fatto, beve</span>
                    </motion.div>
                    <div style={{ ...S.cardCorner, bottom: 16, top: 'auto', right: 'auto', left: 16, transform: 'rotate(180deg)' }}>
                      <span style={S.cornerEmoji}>🍻</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ ...S.card, ...S.emptyCard }}
                  >
                    <div style={{ fontSize: 72, marginBottom: 12 }}>🃏</div>
                    <div style={S.emptyTitle}>Pronto?</div>
                    <div style={S.emptyText}>
                      {isHost
                        ? 'Tocca "Pesca" per girare la prima carta'
                        : "Aspettando che l'host peschi..."}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div style={S.footer}>
            {isHost ? (
              <Button variant="primary" width="full" onClick={handleDraw}>
                {card ? 'Prossima carta' : 'Pesca'}
              </Button>
            ) : (
              <p style={S.waiting}>👑 L'host pesca le carte</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const S = {
  container: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'clamp(10px, 1.5dvh, 16px) clamp(14px, 3vw, 20px)',
    flexShrink: 0, borderBottom: '1px solid var(--border)',
    background: 'color-mix(in srgb, var(--surface) 65%, transparent)', backdropFilter: 'blur(8px)',
  },
  counterBadge: {
    background: 'var(--bg2)', color: 'var(--accent)',
    fontWeight: 800, fontSize: 'clamp(11px, 1.4dvh, 13px)',
    padding: '5px 12px', borderRadius: 999,
    border: '1.5px solid var(--border-strong)',
    letterSpacing: '0.05em', minWidth: 40, textAlign: 'center',
  },
  body: {
    flex: 1, minHeight: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 4vw, 28px)',
    overflow: 'hidden',
  },
  deckWrap: { position: 'relative', width: '100%', maxWidth: 460, perspective: '1200px' },
  ghostCard: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(145deg, #FED7AA 0%, #FB923C 100%)',
    borderRadius: 26, opacity: 0.85,
    boxShadow: '0 8px 24px rgba(249, 115, 22, 0.18)',
  },
  card: {
    position: 'relative',
    background: 'linear-gradient(145deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
    borderRadius: 26,
    padding: 'clamp(28px, 4dvh, 44px) clamp(22px, 4.5vw, 36px)',
    boxShadow: '0 20px 50px rgba(249, 115, 22, 0.40), inset 0 1px 0 rgba(255,255,255,0.3)',
    color: '#fff', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 'clamp(10px, 1.5dvh, 14px)', border: '1px solid rgba(255,255,255,0.25)',
    minHeight: 'clamp(280px, 40dvh, 360px)', overflow: 'hidden',
  },
  cardCorner: { position: 'absolute', top: 16, right: 16, opacity: 0.5, pointerEvents: 'none' },
  cornerEmoji: { fontSize: 26, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' },
  cardLabel: {
    fontSize: 'clamp(11px, 1.5dvh, 14px)', fontWeight: 900,
    letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)',
    padding: '5px 14px', borderRadius: 999, backdropFilter: 'blur(4px)', marginTop: 8,
  },
  cardText: {
    fontSize: 'clamp(22px, 3.5dvh, 32px)', fontWeight: 800,
    letterSpacing: '-0.015em', lineHeight: 1.25,
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.18)', padding: '8px 4px',
  },
  cardHint: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(0,0,0,0.20)', backdropFilter: 'blur(6px)',
    padding: '7px 14px', borderRadius: 999,
    fontSize: 'clamp(12px, 1.5dvh, 14px)', fontWeight: 700,
    letterSpacing: '0.02em', marginBottom: 8,
  },
  emptyCard: {
    background: 'var(--surface)', color: 'var(--text)',
    border: '2px dashed var(--border-strong)',
    boxShadow: 'var(--shadow-md)', justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 'clamp(22px, 3dvh, 28px)', fontWeight: 900,
    color: 'var(--text)',
  },
  emptyText: {
    color: 'var(--muted)', fontSize: 'clamp(13px, 1.7dvh, 16px)',
    lineHeight: 1.4, maxWidth: 280,
  },
  footer: {
    flexShrink: 0, padding: 'clamp(12px, 1.8dvh, 18px) clamp(16px, 4vw, 24px)',
    borderTop: '1px solid var(--border)',
    background: 'color-mix(in srgb, var(--surface) 60%, transparent)', backdropFilter: 'blur(8px)',
  },
  waiting: {
    margin: 0, textAlign: 'center', color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)', fontWeight: 600, padding: '12px 0',
  },
}

export default NeverHaveI
