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

import { lazy, Suspense, useReducer, useCallback, useEffect, useMemo } from 'react'
import { cardTableTheme } from '../_shared/cardTableTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import IconButton from '../../components/ui/IconButton'
import Button from '../../components/ui/Button'
import MiniBlob from '../../components/MiniBlob'
import CardView from '../../lib/cards/CardView'
import { createDeck, shuffle, draw } from '../../lib/cards/italianDeck'
import { useSession } from '../../stores/useSession'
import { accentBtnStyle } from '../../theme/gameColors'
import { usePlayerAccent } from '../../hooks/usePlayerAccent'
import { pickColor } from '../../utils/colors'
import { cardPoints, cardStrength } from './logic'

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
  const playersSession = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const me = useMemo(
    () => playersSession.find((p) => p.id === localPlayerId) ?? playersSession[0],
    [playersSession, localPlayerId]
  )

  // CPU auto-play
  useEffect(() => {
    if (state.phase !== 'cpu_turn') return
    const t = setTimeout(() => dispatch({ type: 'CPU_PLAY' }), 900)
    return () => clearTimeout(t)
  }, [state.phase, state.trick.length])

  // Resolving → resolve dopo breve pausa per vedere le carte.
  useEffect(() => {
    if (state.phase !== 'resolving') return
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_TRICK' }), 1500)
    return () => clearTimeout(t)
  }, [state.phase])

  const handlePlay = useCallback((cardId) => dispatch({ type: 'PLAYER_PLAY', cardId }), [])
  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  const myPoints = state.captures.p0.reduce((s, c) => s + cardPoints(c), 0)
  const cpuPoints = state.captures.cpu.reduce((s, c) => s + cardPoints(c), 0)
  const cpuColor = pickColor(2)

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* CPU header */}
        <div style={S.opHeader}>
          <MiniBlob color={cpuColor} size={32} id="bri-cpu" />
          <span style={S.opName}>CPU</span>
          <span style={S.opPoints}>{state.phase === 'game_over' ? `${cpuPoints} pt` : ''}</span>
          <span style={S.opHand}>🃏 {state.hands.cpu.length}</span>
        </div>

        {/* CPU hand (face down) */}
        <div style={S.handRow}>
          {state.hands.cpu.map((c) => (
            <CardView key={c.id} faceDown size="sm" />
          ))}
        </div>

        {/* Deck + briscola indicator (left side) */}
        <div style={S.middleRow}>
          <div style={S.deckArea}>
            {state.deck.length > 0 ? (
              <>
                {/* Briscola sotto il mazzo: visibile sdraiata orizzontalmente */}
                <div style={{ position: 'absolute', transform: 'rotate(90deg)', left: 16, top: 30 }}>
                  <CardView card={state.briscola} size="sm" />
                </div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <CardView faceDown size="sm" />
                </div>
                <span style={S.deckCounter}>{state.deck.length}</span>
              </>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
            )}
          </div>

          {/* Trick area (center) */}
          <div style={S.trickArea}>
            <span style={S.trickLabel}>Presa</span>
            <div style={S.trickCards}>
              <AnimatePresence>
                {state.trick.map((t) => (
                  <motion.div
                    key={t.card.id}
                    initial={{ scale: 0.5, opacity: 0, y: t.player === 'cpu' ? -20 : 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                  >
                    <CardView card={t.card} size="md" />
                  </motion.div>
                ))}
              </AnimatePresence>
              {state.trick.length === 0 && (
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>vuota</span>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={S.messageBox}>{state.message}</div>

        {/* Game over banner */}
        <AnimatePresence>
          {state.phase === 'game_over' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                ...S.resultBanner,
                background: state.winner === 'p0'
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : state.winner === 'tie'
                  ? 'linear-gradient(90deg, #6B7280, #9CA3AF)'
                  : 'linear-gradient(90deg, #EF4444, #F87171)',
              }}
            >
              {state.winner === 'p0'
                ? `🏆 Hai vinto! ${state.finalScore.p0} a ${state.finalScore.cpu}`
                : state.winner === 'tie'
                ? `🤝 Pareggio 60-60`
                : `😬 CPU vince ${state.finalScore.cpu} a ${state.finalScore.p0}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* My header */}
        <div style={S.opHeader}>
          <MiniBlob color={me?.color || '#F59E0B'} size={32} id="bri-me" />
          <span style={S.opName}>{me?.name || 'Tu'}</span>
          <span style={S.opPoints}>{state.phase === 'game_over' ? `${myPoints} pt` : ''}</span>
          <span style={S.opHand}>🃏 {state.hands.p0.length}</span>
        </div>

        {/* My hand */}
        <div style={S.handRow}>
          {state.hands.p0.map((c) => (
            <CardView
              key={c.id}
              card={c}
              size="lg"
              onClick={state.phase === 'player_turn' ? () => handlePlay(c.id) : undefined}
              disabled={state.phase !== 'player_turn'}
              highlight={c.suit === state.briscola.suit}
            />
          ))}
        </div>
      </div>

      <div style={S.footer}>
        {state.phase === 'game_over' ? (
          <Button
            variant="primary"
            width="full"
            onClick={handleRestart}
            style={accentBtnStyle(C.accent)}
          >
            Nuova partita
          </Button>
        ) : (
          <p style={S.footerHint}>
            Briscola: <strong>{state.briscola.suit}</strong>. Le tue carte di briscola sono evidenziate.
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
  opName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 14,
  },
  opPoints: {
    fontSize: 12,
    fontWeight: 700,
    color: '#FBBF24',
    fontVariantNumeric: 'tabular-nums',
  },
  opHand: {
    marginLeft: 'auto',
    fontSize: 11,
    color: 'var(--muted)',
  },
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
