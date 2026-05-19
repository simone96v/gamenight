// Briscola — 1v1 vs CPU. MVP single-player.
// Regole MVP (forma classica 2 giocatori):
//   - Mazzo 40 carte. Ognuno riceve 3 carte. La prima carta del mazzo rimasto
//     è la BRISCOLA: il suo seme comanda su tutti.
//   - Si alterna chi apre la presa. Chi vince la presa apre la successiva.
//   - Non c'è obbligo di rispondere al seme. Si può giocare qualsiasi carta.
//   - Risoluzione presa:
//       a) Entrambe stesso seme NON briscola → vince la più "forte".
//       b) Diversi semi e nessuna briscola → vince chi ha aperto.
//       c) Una briscola contro non-briscola → vince la briscola.
//       d) Entrambe briscola → vince la più "forte".
//   - Dopo ogni presa: il vincitore pesca 1, poi il perdente pesca 1.
//     L'ultima carta del mazzo (visibile come briscola) la pesca il perdente
//     della presa che svuota il mazzo.
//   - Forza in un seme (decrescente):
//       Asso(1) > Tre(3) > Re(10) > Cavallo(9) > Fante(8) > 7 > 6 > 5 > 4 > 2
//   - Punti carte: Asso=11, Tre=10, Re=4, Cavallo=3, Fante=2, altre=0 (tot. 120).
//   - Vince chi supera 60. 60-60 pareggio.

import { lazy, Suspense, useReducer, useCallback, useEffect, useMemo, useState } from 'react'
import { cardTableTheme } from '../_shared/cardTableTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import IconButton from '../../components/ui/IconButton'
import SoloEndScreen from '../../components/SoloEndScreen'
import GameButton from '../_shared/GameButton'
import MiniBlob from '../../components/MiniBlob'
import CardView from '../../lib/cards/CardView'
import { createDeck, shuffle, draw } from '../../lib/cards/italianDeck'
import { useSession } from '../../stores/useSession'
import { usePlayerAccent } from '../../hooks/usePlayerAccent'
import { pickColor } from '../../utils/colors'
import { cardPoints, cardStrength } from './logic'
import { TableBox } from '../_shared/CardGameUI'

// Branch online/solo top-level. Il componente online è lazy così il chunk del
// solo non eredita pesi della rete (è completamente isolato).
const BriscolaOnline = lazy(() => import('./BriscolaOnline'))

const initialState = () => {
  let deck = shuffle(createDeck())
  // Mani: 3 a player, 3 a CPU.
  const { dealt: pHand, rest: r1 } = draw(deck, 3)
  const { dealt: cHand, rest: r2 } = draw(r1, 3)
  // Briscola: prossima carta = trump. Va in fondo al mazzo (è l'ultima ad essere pescata).
  const { dealt: briscola, rest: r3 } = draw(r2, 1)
  deck = [...r3, briscola[0]]  // briscola in fondo

  return {
    deck,
    briscola: briscola[0],
    hands: { p0: pHand, cpu: cHand },
    captures: { p0: [], cpu: [] },
    trick: [],            // [{ player, card }] in ordine di gioco
    leader: 'p0',         // chi apre questa presa (random sarebbe ok, ma player apre primo)
    phase: 'player_turn', // player_turn | cpu_turn | resolving | game_over
    message: 'Apri tu la prima presa.',
    winner: null,         // p0 | cpu | tie
  }
}

// Determina chi vince la presa correntemente sul tavolo.
const trickWinner = (trick, briscolaSuit) => {
  const [first, second] = trick
  const firstIsBrisc = first.card.suit === briscolaSuit
  const secondIsBrisc = second.card.suit === briscolaSuit

  if (firstIsBrisc && secondIsBrisc) {
    return cardStrength(first.card) > cardStrength(second.card) ? first.player : second.player
  }
  if (firstIsBrisc) return first.player
  if (secondIsBrisc) return second.player
  // Stesso seme → forza decide. Diversi semi → primo (chi ha aperto) vince.
  if (first.card.suit === second.card.suit) {
    return cardStrength(first.card) > cardStrength(second.card) ? first.player : second.player
  }
  return first.player
}

// CPU sceglie quale carta giocare.
const cpuPickCard = (state) => {
  const hand = state.hands.cpu
  if (hand.length === 0) return null
  const briscolaSuit = state.briscola.suit

  // Se sta rispondendo (trick ha già 1 carta):
  if (state.trick.length === 1) {
    const led = state.trick[0].card
    const trickValue = cardPoints(led)

    // Trova mosse vincenti
    const winning = hand.filter((c) => {
      const fakeTrick = [...state.trick, { player: 'cpu', card: c }]
      return trickWinner(fakeTrick, briscolaSuit) === 'cpu'
    })

    if (winning.length > 0) {
      // Se la presa vale ≥10 punti, prendila col mezzo più economico.
      // Se vale 0-9, prendila solo se puoi farlo "gratis" (carta da 0 punti
      // o briscola bassa quando la presa vale ≥4).
      if (trickValue >= 10) {
        return winning.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
      }
      // Prendi con carta da 0 punti se possibile
      const freeWin = winning.filter((c) => cardPoints(c) === 0)
      if (freeWin.length > 0) {
        return freeWin.sort((a, b) => cardStrength(a) - cardStrength(b))[0]
      }
      // Trick con valore ≥4 e ho briscola bassa con 0 punti?
      if (trickValue >= 4) {
        const lowBrisc = winning.filter((c) => c.suit === briscolaSuit && cardPoints(c) === 0)
        if (lowBrisc.length > 0) {
          return lowBrisc.sort((a, b) => cardStrength(a) - cardStrength(b))[0]
        }
      }
    }
    // Non vale la pena prendere → scarta la peggiore (non briscola, bassi punti, bassa forza)
    const nonBrisc = hand.filter((c) => c.suit !== briscolaSuit)
    const pool = nonBrisc.length > 0 ? nonBrisc : hand
    return pool.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
  }

  // Sta aprendo: gioca la carta più economica (non briscola, bassi punti).
  const nonBrisc = hand.filter((c) => c.suit !== briscolaSuit)
  const pool = nonBrisc.length > 0 ? nonBrisc : hand
  return pool.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
}

// Aggiunge una carta alla trick corrente.
const playCardAction = (state, playerId, card) => {
  const newHand = state.hands[playerId].filter((c) => c.id !== card.id)
  const newTrick = [...state.trick, { player: playerId, card }]
  return {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    trick: newTrick,
  }
}

// Risolve presa, pesca carte se mazzo non vuoto, decide chi apre la prossima.
const resolveTrick = (state) => {
  const winner = trickWinner(state.trick, state.briscola.suit)
  const loser = winner === 'p0' ? 'cpu' : 'p0'
  const trickCards = state.trick.map((t) => t.card)
  const captures = { ...state.captures, [winner]: [...state.captures[winner], ...trickCards] }

  // Pesca: vincitore prima, perdente dopo.
  let deck = state.deck
  const newHands = { ...state.hands }
  if (deck.length > 0) {
    const { dealt: w, rest: d1 } = draw(deck, 1)
    newHands[winner] = [...newHands[winner], ...w]
    deck = d1
  }
  if (deck.length > 0) {
    const { dealt: l, rest: d2 } = draw(deck, 1)
    newHands[loser] = [...newHands[loser], ...l]
    deck = d2
  }

  // Fine partita?
  if (newHands.p0.length === 0 && newHands.cpu.length === 0) {
    const p0Pts = captures.p0.reduce((s, c) => s + cardPoints(c), 0)
    const cpuPts = captures.cpu.reduce((s, c) => s + cardPoints(c), 0)
    let finalWinner
    if (p0Pts > 60) finalWinner = 'p0'
    else if (cpuPts > 60) finalWinner = 'cpu'
    else if (p0Pts === 60 && cpuPts === 60) finalWinner = 'tie'
    else finalWinner = p0Pts > cpuPts ? 'p0' : 'cpu'  // edge case scratta
    return {
      ...state,
      hands: newHands,
      deck,
      captures,
      trick: [],
      leader: winner,
      phase: 'game_over',
      message: `${winner === 'p0' ? 'Hai vinto' : winner === 'cpu' ? 'CPU vince'  : ''} la presa.`,
      finalScore: { p0: p0Pts, cpu: cpuPts },
      winner: finalWinner,
    }
  }

  return {
    ...state,
    hands: newHands,
    deck,
    captures,
    trick: [],
    leader: winner,
    phase: winner === 'p0' ? 'player_turn' : 'cpu_turn',
    message: winner === 'p0' ? 'Hai vinto la presa, apri tu!' : 'CPU ha vinto, apre lei.',
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAYER_PLAY': {
      if (state.phase !== 'player_turn') return state
      const card = state.hands.p0.find((c) => c.id === action.cardId)
      if (!card) return state
      const next = playCardAction(state, 'p0', card)
      // Se è ancora il turno del player (era leader e CPU deve rispondere)
      if (next.trick.length === 1) {
        return { ...next, phase: 'cpu_turn', message: 'CPU sta rispondendo...' }
      }
      // Trick completo → resolving
      return { ...next, phase: 'resolving' }
    }
    case 'CPU_PLAY': {
      if (state.phase !== 'cpu_turn') return state
      const card = cpuPickCard(state)
      if (!card) return state
      const next = playCardAction(state, 'cpu', card)
      if (next.trick.length === 1) {
        return { ...next, phase: 'player_turn', message: 'CPU ha aperto: tocca a te.' }
      }
      return { ...next, phase: 'resolving' }
    }
    case 'RESOLVE_TRICK':
      if (state.phase !== 'resolving') return state
      return resolveTrick(state)
    case 'RESTART':
      return initialState()
    default:
      return state
  }
}

// ── Componente ──────────────────────────────────────────

const Briscola = () => {
  // Online → delega al componente multi.
  const mode = useSession((s) => s.mode)
  if (mode === 'online') {
    return (
      <Suspense fallback={null}>
        <BriscolaOnline />
      </Suspense>
    )
  }
  return <BriscolaSolo />
}

const BriscolaSolo = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [hoveredCardId, setHoveredCardId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const playersSession = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const me = useMemo(
    () => playersSession.find((p) => p.id === localPlayerId) ?? playersSession[0],
    [playersSession, localPlayerId]
  )

  // CPU auto-play (snappier: 600ms invece di 900)
  useEffect(() => {
    if (state.phase !== 'cpu_turn') return
    const t = setTimeout(() => dispatch({ type: 'CPU_PLAY' }), 600)
    return () => clearTimeout(t)
  }, [state.phase, state.trick.length])

  // Resolving → resolve dopo breve pausa (1000ms invece di 1500).
  useEffect(() => {
    if (state.phase !== 'resolving') return
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_TRICK' }), 1000)
    return () => clearTimeout(t)
  }, [state.phase])

  const handlePlay = useCallback((cardId) => dispatch({ type: 'PLAYER_PLAY', cardId }), [])
  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  const myPoints = state.captures.p0.reduce((s, c) => s + cardPoints(c), 0)
  const cpuPoints = state.captures.cpu.reduce((s, c) => s + cardPoints(c), 0)
  const cpuColor = pickColor(2)

  // Preview live: per ogni carta in mano, predici se vince la presa se giocata.
  // Solo se CPU ha già aperto (trick.length === 1) e siamo nel turno player.
  const previewWin = useMemo(() => {
    if (state.phase !== 'player_turn' || state.trick.length !== 1) return null
    const result = {}
    for (const card of state.hands.p0) {
      const fakeTrick = [...state.trick, { player: 'p0', card }]
      result[card.id] = trickWinner(fakeTrick, state.briscola.suit) === 'p0'
    }
    return result
  }, [state.phase, state.trick, state.hands.p0, state.briscola.suit])

  // Fine partita → SoloEndScreen
  if (state.phase === 'game_over') {
    const won = state.winner === 'p0'
    const tied = state.winner === 'tie'
    return (
      <SoloEndScreen
        gameEmoji="🃏"
        gameName="Briscola"
        player={me}
        primaryValue={state.finalScore?.p0 ?? myPoints}
        primaryLabel="punti"
        stats={[
          { label: 'esito', value: tied ? '🤝 Pareggio' : won ? '🏆 Vittoria' : '😬 Sconfitta' },
          { label: 'CPU', value: state.finalScore?.cpu ?? cpuPoints },
        ]}
        onReplay={handleRestart}
        onChangeGame={handleExit}
      />
    )
  }

  const isMyTurn = state.phase === 'player_turn'
  const isCpuTurn = state.phase === 'cpu_turn'
  const isResolving = state.phase === 'resolving'

  const statusText = isMyTurn
    ? state.trick.length === 0 ? 'Apri tu la presa' : 'Tocca a te — rispondi'
    : isCpuTurn ? 'CPU sta giocando...'
    : isResolving ? 'Presa in corso...'
    : ''

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
        actions={<IconButton ariaLabel="Regole" onClick={() => setHelpOpen(true)}>?</IconButton>}
      />

      <div style={S.body}>
        {/* ── TOP STRIP: CPU score + Briscola + Deck ─────────────── */}
        <div style={S.topStrip}>
          <div style={S.playerCard}>
            <MiniBlob color={cpuColor} size={28} id="bri-cpu" />
            <div style={S.playerCardInfo}>
              <span style={S.playerCardName}>CPU</span>
              <span style={S.playerCardSub}>{state.hands.cpu.length} carte</span>
            </div>
            <ScoreNumber value={cpuPoints} />
          </div>

          {state.briscola && (
            <div style={S.briscolaPanel}>
              <span style={S.briscolaLabel}>Briscola</span>
              <CardView card={state.briscola} size="xs" />
              {state.deck.length > 0 && (
                <span style={S.deckPill}>🂠 {state.deck.length}</span>
              )}
            </div>
          )}
        </div>

        {/* CPU coperte (decorazione, mostra solo quanti) */}
        <div style={S.cpuHandRow}>
          {state.hands.cpu.map((c) => (
            <CardView key={c.id} faceDown size="xs" />
          ))}
        </div>

        {/* ── TRICK AREA — TableBox (stessa box di Scopa, dim. fisse) ── */}
        <TableBox label="🟫 Tavolo" info={`Mazzo: ${state.deck.length}`}>
          <AnimatePresence>
            {state.trick.length === 0 && (
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
            {state.trick.map((t, i) => (
              <motion.div
                key={t.card.id}
                initial={{
                  scale: 0.5,
                  opacity: 0,
                  y: t.player === 'cpu' ? -40 : 40,
                  rotate: t.player === 'cpu' ? -6 : 6,
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

        {/* Status message */}
        <div style={S.statusRow}>
          <span style={{
            ...S.statusText,
            color: isMyTurn ? C.accent : 'var(--muted)',
          }}>
            {statusText}
          </span>
        </div>

        {/* ── PLAYER STRIP: mano + score ─────────────────────── */}
        <div style={S.playerStrip}>
          <div style={S.handFan}>
            {state.hands.p0.map((c, i) => {
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
                    disabled={!isMyTurn}
                    highlight={c.suit === state.briscola.suit}
                  />
                  {/* Preview "vincerai/perderai" sopra la carta */}
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

          <div style={S.playerCardSelf}>
            <MiniBlob color={me?.color || '#F59E0B'} size={28} id="bri-me" />
            <div style={S.playerCardInfo}>
              <span style={S.playerCardName}>{me?.name || 'Tu'}</span>
              <span style={S.playerCardSub}>{state.hands.p0.length} carte</span>
            </div>
            <ScoreNumber value={myPoints} accent={C.accent} />
          </div>
        </div>
      </div>

      <div style={S.footer}>
        {state.phase === 'game_over' ? (
          <GameButton variant="primary" accent={C.accent} icon="🔁" onClick={handleRestart}>
            Nuova partita
          </GameButton>
        ) : (
          <p style={S.footerHint}>
            Le tue carte di <strong>{state.briscola.suit}</strong> battono qualsiasi altro seme.
          </p>
        )}
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} briscolaSuit={state.briscola.suit} />
    </div>
  )
}

// ── Componenti UI helper ────────────────────────────────────

const ScoreNumber = ({ value, accent }) => (
  <motion.span
    key={value}
    initial={{ scale: 1.4, opacity: 0.6 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 340, damping: 20 }}
    style={{
      fontFamily: "'Baloo 2', cursive",
      fontWeight: 900,
      fontSize: 22,
      color: accent || 'var(--text)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em',
      marginLeft: 'auto',
    }}
  >
    {value}
  </motion.span>
)

const HelpModal = ({ open, onClose, briscolaSuit }) => {
  if (!open) return null
  return (
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
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 22, margin: '0 0 12px' }}>
          🃏 Regole Briscola
        </h2>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 12px' }}>
            <strong>Briscola: {briscolaSuit}</strong> — comanda su tutti gli altri semi.
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
        </div>
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
  // Top strip: CPU score card sx, Briscola panel dx
  topStrip: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    alignItems: 'stretch',
  },
  playerCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  },
  playerCardSelf: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  playerCardInfo: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  playerCardName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 13,
    color: 'var(--text)',
  },
  playerCardSub: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--muted)',
    letterSpacing: '0.02em',
  },
  briscolaPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: 'var(--surface)',
    border: '1.5px solid var(--text)',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  briscolaLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: 'var(--text)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  deckPill: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  cpuHandRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 70,
  },
  // Trick stage: area centrale FOCUS con outline tavolo
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
  statusRow: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    minHeight: 24,
  },
  statusText: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.01em',
  },
  // Player strip in basso: hand a sinistra, score card a destra
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
}

export default Briscola
