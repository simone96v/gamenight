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
import CardView from '../../lib/cards/CardView'
import { useSession } from '../../stores/useSession'
import { rpcUpdateGameState, rpcPlayerUpdate, pushRoom } from '../../lib/room'
import { usePlayerAccent } from '../../hooks/usePlayerAccent'
import {
  initialState as makeInitialState,
  cardPoints,
  reducer,
  trickWinner,
} from './logic'
import { PlayerCard, BriscolaPanel, StatusBar, HelpModal, TableBox } from '../_shared/CardGameUI'

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
  const [hoveredCardId, setHoveredCardId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)

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

  // "Cambia gioco" online: solo host → pusha phase 'game_voting' che riporta
  // tutti su /games per rivotare. Pattern identico a Trivia.handleChangeGame.
  const handleChangeGame = useCallback(async () => {
    if (!isHost) return
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    await pushRoom(roomCode, 'game_voting', {
      players: resetPlayers,
      currentIdx: 0,
      round: 0,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      selectedGameCategory: s.gameState?.selectedGameCategory ?? null,
      gameCategoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    })
  }, [isHost, roomCode])

  // Memo: mia mano + preview vincite — calcolati anche se briState è null
  // (per evitare conditional hooks). Le early-return sotto si occupano del rendering.
  const myHand = useMemo(
    () => (briState && me ? (briState.hands[me.id] || []) : []),
    [briState, me]
  )
  const previewWin = useMemo(() => {
    if (!briState || !me) return null
    if (briState.turn !== me.id || briState.phase !== 'playing') return null
    if (briState.trick.length !== 1) return null
    const result = {}
    for (const card of myHand) {
      const fakeTrick = [...briState.trick, { player: me.id, card }]
      result[card.id] = trickWinner(fakeTrick, briState.briscola.suit) === me.id
    }
    return result
  }, [briState, me, myHand])

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

  const statusText = isMyTurn
    ? briState.trick.length === 0 ? 'Apri tu la presa' : 'Tocca a te — rispondi'
    : briState.phase === 'playing' ? `${opponent.name} sta giocando...`
    : briState.phase === 'resolving' ? 'Presa in corso...'
    : ''

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
        actions={<IconButton ariaLabel="Regole" onClick={() => setHelpOpen(true)}>?</IconButton>}
      />

      <div style={S.body}>
        {/* ── TOP STRIP: avversario + briscola panel ─────────── */}
        <div style={S.topStrip}>
          <PlayerCard
            color={opponent.color}
            name={opponent.name}
            sub={`${oppHandCount} carte`}
            score={oppPoints}
            id="brion-opp"
            flex
          />
          <BriscolaPanel card={briState.briscola} deckCount={briState.deck.length} />
        </div>

        {/* Avversario hand (face down, decorativa) */}
        <div style={S.cpuHandRow}>
          {Array.from({ length: oppHandCount }).map((_, i) => (
            <CardView key={i} faceDown size="xs" />
          ))}
        </div>

        {/* ── TRICK STAGE — TableBox condiviso, dim. fisse ────── */}
        <TableBox label="🟫 Presa" info={`Mazzo: ${briState.deck.length}`}>
          <AnimatePresence>
            {briState.trick.length === 0 && (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 12, color: 'var(--muted)' }}
              >
                Vuoto
              </motion.span>
            )}
            {briState.trick.map((t, i) => (
              <motion.div
                key={t.card.id}
                initial={{
                  scale: 0.5,
                  opacity: 0,
                  y: t.player === opponent.id ? -40 : 40,
                  rotate: t.player === opponent.id ? -6 : 6,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  rotate: i === 0 ? -3 : 4,
                  x: i === 0 ? -12 : 12,
                }}
                exit={{ scale: 0.6, opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{ position: 'absolute' }}
              >
                <CardView card={t.card} size="md" />
              </motion.div>
            ))}
          </AnimatePresence>
        </TableBox>

        {/* Status */}
        <StatusBar text={statusText} accent={isMyTurn ? C.accent : undefined} dim={!isMyTurn} />

        {/* Game over banner inline */}
        <AnimatePresence>
          {banner && briState.phase !== 'game_over' && (
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

        {/* ── PLAYER STRIP: mano + score card ────────────────── */}
        <div style={S.playerStrip}>
          <div style={S.handFan}>
            {myHand.map((c, i) => {
              const isHovered = hoveredCardId === c.id
              const wouldWin = previewWin?.[c.id]
              return (
                <motion.div
                  key={c.id}
                  onHoverStart={() => setHoveredCardId(c.id)}
                  onHoverEnd={() => setHoveredCardId(null)}
                  style={{
                    position: 'relative',
                    marginLeft: i === 0 ? 0 : -18,
                    zIndex: isHovered ? 10 : i,
                  }}
                >
                  <CardView
                    card={c}
                    size="lg"
                    onClick={isMyTurn ? () => handlePlay(c.id) : undefined}
                    disabled={!isMyTurn || submitting}
                    highlight={c.suit === briState.briscola.suit}
                  />
                  {isHovered && wouldWin !== undefined && isMyTurn && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        ...S.previewBadge,
                        background: wouldWin
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : 'linear-gradient(90deg, #EF4444, #F87171)',
                      }}
                    >
                      {wouldWin ? '✓ vinci' : '✗ perdi'}
                    </motion.span>
                  )}
                </motion.div>
              )
            })}
          </div>

          <PlayerCard
            color={me.color}
            name={me.name}
            sub={`${myHand.length} carte`}
            score={myPoints}
            accent={C.accent}
            id="brion-me"
            active={isMyTurn}
          />
        </div>
      </div>

      <div style={S.footer}>
        {briState.phase === 'game_over' ? (
          isHost ? (
            <div style={S.ctaRow}>
              <GameButton variant="secondary" onClick={handleChangeGame}>
                Cambia gioco
              </GameButton>
              <GameButton variant="primary" accent={C.accent} icon="⚔️" onClick={handleRestart}>
                Rivincita
              </GameButton>
            </div>
          ) : (
            <p style={S.footerHint}>In attesa che {pA.name} avvii una rivincita...</p>
          )
        ) : (
          <p style={S.footerHint}>
            Le tue carte di <strong>{briState.briscola.suit}</strong> battono qualsiasi altro seme.
          </p>
        )}
      </div>

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        emoji="🃏"
        title="Regole Briscola"
      >
        <p style={{ margin: '0 0 12px' }}>
          <strong>Briscola: {briState.briscola.suit}</strong> — comanda su tutti gli altri semi.
        </p>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Forza (dal più forte):</p>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
          Asso · 3 · Re · Cavallo · Fante · 7 · 6 · 5 · 4 · 2
        </p>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Punti carte:</p>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
          Asso = 11 · 3 = 10 · Re = 4 · Cavallo = 3 · Fante = 2 · altre = 0
        </p>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
          Vince chi supera 60 punti su 120 totali. 60-60 = pareggio.
        </p>
      </HelpModal>
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
    color: 'var(--text)',
  },
  topStrip: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    alignItems: 'stretch',
  },
  cpuHandRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 70,
  },
  trickStage: {
    flex: 1,
    minHeight: 130,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    background: 'radial-gradient(circle at center, color-mix(in srgb, var(--text) 4%, transparent) 0%, transparent 70%)',
    borderRadius: 16,
  },
  trickEmpty: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  playerStrip: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    flexShrink: 0,
  },
  handFan: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    minHeight: 140,
    paddingTop: 6,
  },
  previewBadge: {
    position: 'absolute',
    top: -22,
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
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
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
  },
  footerHint: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted)',
    textAlign: 'center',
  },
  ctaRow: {
    display: 'flex',
    gap: 10,
  },
}

export default BriscolaOnline
