// Briscola Online — 1v1 sincronizzato via Supabase Realtime.
// Architettura: host-authoritative.
//   - Host inizializza il game state (mazzo, mani, briscola) e lo pubblica
//     in session.gameState.bri tramite update_game_state.
//   - Il giocatore non-host scrive la propria mossa in
//     session.gameState.bri.pendingMove via player_update_game_state.
//   - Un effect host monitora pendingMove, applica via reducer, ripulisce
//     pendingMove e ripubblica lo state.
//   - Trust model: client può "vedere" la mano dell'avversario tramite devtools
//     (lo state è pubblico in JSONB). Accettabile per partite tra amici.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cardTableTheme } from '../_shared/cardTableTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import IconButton from '../../components/ui/IconButton'
import GameButton from '../_shared/GameButton'
import MiniBlob from '../../components/MiniBlob'
import CardView from '../../lib/cards/CardView'
import { useSession } from '../../stores/useSession'
import { rpcUpdateGameState, rpcPlayerUpdate } from '../../lib/room'
import { usePlayerAccent } from '../../hooks/usePlayerAccent'
import {
  initialState as makeInitialState,
  cardPoints,
  reducer,
} from './logic'

const STATE_KEY = 'bri'        // chiave per lo state del gioco dentro gameState
const PENDING_KEY = 'briPending'  // chiave separata per la mossa pending del client

const BriscolaOnline = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const players = useSession((s) => s.players)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const gameState = useSession((s) => s.gameState)

  const briState = gameState?.[STATE_KEY] || null
  const briPending = gameState?.[PENDING_KEY] || null

  // 1v1: usa i primi 2 player del party come avversari.
  const [pA, pB] = useMemo(() => players.slice(0, 2), [players])
  const me = useMemo(
    () => players.find((p) => p.id === localPlayerId) ?? pA,
    [players, localPlayerId, pA]
  )
  const opponent = me?.id === pA?.id ? pB : pA

  // ── Init: solo host, una volta sola, quando ci sono 2 player. ─────
  useEffect(() => {
    if (!isHost) return
    if (briState) return
    if (!pA || !pB) return
    const init = makeInitialState([pA.id, pB.id])
    rpcUpdateGameState(roomCode, localPlayerId, { [STATE_KEY]: init })
  }, [isHost, briState, pA, pB, roomCode, localPlayerId])

  // ── Host: processa la pendingMove dell'avversario (campo separato in gameState
  // per evitare race con scritture host concorrenti sullo state principale). ──
  useEffect(() => {
    if (!isHost || !briPending || !briState) return
    // Validazione: la mossa è del giocatore di turno?
    if (briPending.playerId !== briState.turn) {
      rpcUpdateGameState(roomCode, localPlayerId, { [PENDING_KEY]: null })
      return
    }
    const next = reducer(briState, {
      type: 'PLAY_CARD',
      playerId: briPending.playerId,
      cardId: briPending.cardId,
    })
    rpcUpdateGameState(roomCode, localPlayerId, { [STATE_KEY]: next, [PENDING_KEY]: null })
  }, [isHost, briPending, briState, roomCode, localPlayerId])

  // ── Auto resolveTrick (host) quando 2 carte sul tavolo ────────────
  useEffect(() => {
    if (!isHost || !briState) return
    if (briState.phase !== 'resolving') return
    const t = setTimeout(() => {
      const next = reducer(briState, { type: 'RESOLVE_TRICK' })
      rpcUpdateGameState(roomCode, localPlayerId, { [STATE_KEY]: next })
    }, 1500)
    return () => clearTimeout(t)
  }, [isHost, briState, roomCode, localPlayerId])

  // ── Play card handler ─────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)

  const handlePlay = useCallback(async (cardId) => {
    if (!briState || submitting) return
    if (briState.phase !== 'playing') return
    if (briState.turn !== me.id) return

    setSubmitting(true)
    try {
      if (isHost) {
        // Host applica direttamente
        const next = reducer(briState, { type: 'PLAY_CARD', playerId: me.id, cardId })
        await rpcUpdateGameState(roomCode, localPlayerId, { [STATE_KEY]: next })
      } else {
        // Client scrive la pendingMove come campo SEPARATO (no merge con bri).
        // Host la rileverà, validerà e applicherà.
        const pendingMove = { playerId: me.id, cardId, ts: Date.now() }
        await rpcPlayerUpdate(roomCode, localPlayerId, { [PENDING_KEY]: pendingMove })
      }
    } finally {
      // Resetta dopo breve attesa per evitare double-tap
      setTimeout(() => setSubmitting(false), 500)
    }
  }, [briState, isHost, me, roomCode, localPlayerId, submitting])

  // ── Restart (host) ────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    if (!isHost) return
    const init = makeInitialState([pA.id, pB.id])
    rpcUpdateGameState(roomCode, localPlayerId, { [STATE_KEY]: init })
  }, [isHost, pA, pB, roomCode, localPlayerId])

  const handleExit = useCallback(() => navigate('/lobby', { replace: true }), [navigate])

  // ── Loading / waiting screens ─────────────────────────────────────
  if (!pA || !pB) {
    return (
      <div style={S.container}>
        <AppHeader leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>} />
        <div style={S.center}>
          <p style={S.waiting}>Servono 2 giocatori per Briscola.</p>
        </div>
      </div>
    )
  }

  if (!briState) {
    return (
      <div style={S.container}>
        <AppHeader leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>} />
        <div style={S.center}>
          <p style={S.waiting}>
            {isHost ? 'Distribuzione carte...' : `In attesa di ${pA.name}...`}
          </p>
        </div>
      </div>
    )
  }

  const myHand = briState.hands[me.id] || []
  const oppHandCount = (briState.hands[opponent.id] || []).length
  const isMyTurn = briState.turn === me.id && briState.phase === 'playing'
  const myPoints = (briState.captures[me.id] || []).reduce((s, c) => s + cardPoints(c), 0)
  const oppPoints = (briState.captures[opponent.id] || []).reduce((s, c) => s + cardPoints(c), 0)

  // Determina la mossa più recente per il banner
  let banner = null
  if (briState.phase === 'game_over') {
    const winner = briState.winner
    const myFinal = briState.finalScore[me.id]
    const oppFinal = briState.finalScore[opponent.id]
    if (winner === 'tie') {
      banner = { text: `🤝 Pareggio 60-60`, color: 'linear-gradient(90deg, #6B7280, #9CA3AF)' }
    } else if (winner === me.id) {
      banner = { text: `🏆 Hai vinto ${myFinal} a ${oppFinal}!`, color: 'linear-gradient(90deg, #10B981, #34D399)' }
    } else {
      banner = { text: `😬 ${opponent.name} vince ${oppFinal} a ${myFinal}`, color: 'linear-gradient(90deg, #EF4444, #F87171)' }
    }
  } else if (briState.phase === 'resolving') {
    banner = { text: 'Risoluzione presa...', color: 'rgba(0,0,0,0.5)' }
  }

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Opponent header + face-down hand */}
        <div style={S.opHeader}>
          <MiniBlob color={opponent.color} size={32} id="brion-opp" />
          <span style={S.opName}>{opponent.name}</span>
          <span style={S.opPoints}>{briState.phase === 'game_over' ? `${oppPoints} pt` : ''}</span>
          <span style={S.opHand}>🃏 {oppHandCount}</span>
        </div>
        <div style={S.handRow}>
          {Array.from({ length: oppHandCount }).map((_, i) => (
            <CardView key={i} faceDown size="sm" />
          ))}
        </div>

        {/* Deck + briscola + trick area */}
        <div style={S.middleRow}>
          <div style={S.deckArea}>
            {briState.deck.length > 0 ? (
              <>
                <div style={{ position: 'absolute', transform: 'rotate(90deg)', left: 16, top: 30 }}>
                  <CardView card={briState.briscola} size="sm" />
                </div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <CardView faceDown size="sm" />
                </div>
                <span style={S.deckCounter}>{briState.deck.length}</span>
              </>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
            )}
          </div>

          <div style={S.trickArea}>
            <span style={S.trickLabel}>Presa</span>
            <div style={S.trickCards}>
              <AnimatePresence>
                {briState.trick.map((t) => (
                  <motion.div
                    key={t.card.id}
                    initial={{ scale: 0.5, opacity: 0, y: t.player === opponent.id ? -20 : 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                  >
                    <CardView card={t.card} size="md" />
                  </motion.div>
                ))}
              </AnimatePresence>
              {briState.trick.length === 0 && (
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>vuota</span>
              )}
            </div>
          </div>
        </div>

        {/* Status message */}
        <div style={S.messageBox}>
          {isMyTurn && briState.trick.length === 0 && 'Apri tu la presa.'}
          {isMyTurn && briState.trick.length === 1 && 'Tocca a te, rispondi.'}
          {!isMyTurn && briState.phase === 'playing' && `${opponent.name} sta giocando...`}
        </div>

        {/* Game over banner */}
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ ...S.resultBanner, background: banner.color }}
            >
              {banner.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* My header + hand */}
        <div style={S.opHeader}>
          <MiniBlob color={me.color} size={32} id="brion-me" />
          <span style={S.opName}>{me.name}</span>
          <span style={S.opPoints}>{briState.phase === 'game_over' ? `${myPoints} pt` : ''}</span>
          <span style={S.opHand}>🃏 {myHand.length}</span>
        </div>
        <div style={S.handRow}>
          {myHand.map((c) => (
            <CardView
              key={c.id}
              card={c}
              size="lg"
              onClick={isMyTurn ? () => handlePlay(c.id) : undefined}
              disabled={!isMyTurn || submitting}
              highlight={c.suit === briState.briscola.suit}
            />
          ))}
        </div>
      </div>

      <div style={S.footer}>
        {briState.phase === 'game_over' ? (
          isHost ? (
            <GameButton variant="primary" accent={C.accent} icon="⚔️" onClick={handleRestart}>
              Rivincita
            </GameButton>
          ) : (
            <p style={S.footerHint}>In attesa che {pA.name} avvii una rivincita...</p>
          )
        ) : (
          <p style={S.footerHint}>
            Briscola: <strong>{briState.briscola.suit}</strong>. Le tue carte di briscola sono evidenziate.
          </p>
        )}
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
    ...cardTableTheme,
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiting: {
    color: 'var(--text)',
    fontSize: 16,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(8px, 1.4dvh, 14px) clamp(10px, 3vw, 18px)',
    gap: 'clamp(6px, 1.2dvh, 10px)',
    overflow: 'hidden',
    color: '#fff',
  },
  opHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  opName: { fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 14 },
  opPoints: { fontSize: 12, fontWeight: 700, color: '#FBBF24', fontVariantNumeric: 'tabular-nums' },
  opHand: { marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' },
  handRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 90,
  },
  middleRow: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '8px 0',
  },
  deckArea: {
    width: 90,
    height: 110,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deckCounter: {
    position: 'absolute',
    top: -6,
    right: -6,
    background: '#F59E0B',
    color: '#fff',
    fontSize: 11,
    fontWeight: 900,
    padding: '2px 7px',
    borderRadius: 999,
    zIndex: 5,
  },
  trickArea: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  trickLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  trickCards: {
    flex: 1,
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  messageBox: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    minHeight: 20,
    flexShrink: 0,
  },
  resultBanner: {
    alignSelf: 'center',
    padding: '10px 18px',
    borderRadius: 14,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 14,
    textAlign: 'center',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    color: '#fff',
    flexShrink: 0,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(10px, 1.8dvh, 16px) clamp(16px, 4vw, 24px) clamp(14px, 2.5dvh, 20px)',
    background: 'rgba(0,0,0,0.30)',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  footerHint: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted)',
    textAlign: 'center',
  },
}

export default BriscolaOnline
