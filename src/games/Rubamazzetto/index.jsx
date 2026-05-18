// Rubamazzetto — solo vs 2 CPU. MVP single-player.
// Regole MVP:
//   - 3 giocatori, ognuno con 3 carte in mano + un "mazzetto" (pile face-up).
//   - Tavolo: carte scoperte al centro.
//   - Al tuo turno giochi una carta:
//     1. Se matcha (per valore) il TOP del mazzetto di un avversario → rubi
//        il suo intero mazzetto + ci metti sopra la tua carta.
//     2. Altrimenti se matcha (per valore) UNA carta sul tavolo → prendi
//        quella carta + la tua nel tuo mazzetto.
//     3. Altrimenti la carta finisce sul tavolo.
//   - Mano esaurita: si deala 3 carte nuove dal mazzo (a tutti).
//   - Mazzo + mani vuoti: fine partita.
//   - Vincitore: chi ha il mazzetto più alto (più carte).

import { useReducer, useCallback, useEffect, useMemo } from 'react'
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

const HAND_SIZE = 3
const CPU_NAMES = ['Bot Anna', 'Bot Marco']

// ── Game logic ──────────────────────────────────────────

const setupPlayers = () => {
  const players = [
    { id: 'p0', name: 'Tu', color: '#F59E0B', isHuman: true },
  ]
  CPU_NAMES.forEach((name, i) => {
    players.push({ id: `cpu${i + 1}`, name, color: pickColor(i + 2), isHuman: false })
  })
  return players
}

const initialState = () => {
  const players = setupPlayers()
  const deck = shuffle(createDeck())
  const hands = {}
  let d = deck
  for (const p of players) {
    const { dealt, rest } = draw(d, HAND_SIZE)
    hands[p.id] = dealt
    d = rest
  }
  const piles = Object.fromEntries(players.map((p) => [p.id, []]))
  return {
    players,
    deck: d,
    hands,
    piles,            // { playerId: [card, ...] } — top of pile = last index
    tavolo: [],       // carte scoperte
    turnIdx: 0,       // player con priorità (p0 inizia)
    phase: 'playing', // playing | game_over
    log: [],          // messaggi recenti
    winner: null,
  }
}

// Esegue una giocata: applica le regole e ritorna nuovo state.
const playCard = (state, playerId, card) => {
  const player = state.players.find((p) => p.id === playerId)
  const hands = { ...state.hands, [playerId]: state.hands[playerId].filter((c) => c.id !== card.id) }

  // 1. Cerca un avversario con TOP del mazzetto = card.value (ruba!)
  const target = state.players.find((p) => {
    if (p.id === playerId) return false
    const pile = state.piles[p.id]
    return pile.length > 0 && pile[pile.length - 1].value === card.value
  })

  if (target) {
    const stolen = state.piles[target.id]
    const myPile = state.piles[playerId]
    const piles = {
      ...state.piles,
      [target.id]: [],
      [playerId]: [...myPile, ...stolen, card],
    }
    const log = [...state.log, `${player.name} ruba il mazzetto a ${target.name}! (${stolen.length + 1} carte)`].slice(-4)
    return { ...state, hands, piles, log }
  }

  // 2. Match sul tavolo per valore
  const tavoloMatches = state.tavolo.filter((c) => c.value === card.value)
  if (tavoloMatches.length > 0) {
    const tavolo = state.tavolo.filter((c) => !tavoloMatches.some((m) => m.id === c.id))
    const myPile = state.piles[playerId]
    const piles = { ...state.piles, [playerId]: [...myPile, ...tavoloMatches, card] }
    const log = [...state.log, `${player.name} prende ${tavoloMatches.length + 1} carte dal tavolo.`].slice(-4)
    return { ...state, hands, piles, tavolo, log }
  }

  // 3. Lascia la carta sul tavolo
  const tavolo = [...state.tavolo, card]
  const log = [...state.log, `${player.name} lascia ${cardName(card)} sul tavolo.`].slice(-4)
  return { ...state, hands, tavolo, log }
}

// Avanza al prossimo turno. Se le mani sono vuote, deala 3 dal mazzo.
const advanceTurn = (state) => {
  const nextIdx = (state.turnIdx + 1) % state.players.length

  // Tutti senza carte in mano? Distribuisci nuovamente.
  const allEmpty = state.players.every((p) => state.hands[p.id].length === 0)
  if (allEmpty) {
    if (state.deck.length === 0) {
      // Fine partita
      return resolveGame(state)
    }
    // Deal HAND_SIZE per ciascuno (o quanto c'è nel mazzo).
    let d = state.deck
    const newHands = { ...state.hands }
    for (const p of state.players) {
      const n = Math.min(HAND_SIZE, d.length)
      const { dealt, rest } = draw(d, n)
      newHands[p.id] = dealt
      d = rest
      if (d.length === 0) break
    }
    return { ...state, deck: d, hands: newHands, turnIdx: nextIdx }
  }

  return { ...state, turnIdx: nextIdx }
}

const resolveGame = (state) => {
  const counts = state.players.map((p) => ({ player: p, count: state.piles[p.id].length }))
  counts.sort((a, b) => b.count - a.count)
  const winner = counts[0].count > 0 ? counts[0].player : null
  return { ...state, phase: 'game_over', winner, counts }
}

// CPU AI: priorità → ruba mazzetto, prendi dal tavolo, gioca carta più alta.
const cpuChooseCard = (state, playerId) => {
  const hand = state.hands[playerId]
  if (hand.length === 0) return null

  // 1. Ruba se possibile
  for (const card of hand) {
    const stealTarget = state.players.find((p) => {
      if (p.id === playerId) return false
      const pile = state.piles[p.id]
      return pile.length > 0 && pile[pile.length - 1].value === card.value
    })
    if (stealTarget) return card
  }
  // 2. Prendi dal tavolo
  for (const card of hand) {
    if (state.tavolo.some((c) => c.value === card.value)) return card
  }
  // 3. Gioca quella di valore più basso (non sprecare quelle alte)
  return [...hand].sort((a, b) => a.value - b.value)[0]
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state
      const currentId = state.players[state.turnIdx].id
      if (!state.players[state.turnIdx].isHuman) return state
      // Verifica carta esiste nella mano del giocatore corrente
      const card = state.hands[currentId].find((c) => c.id === action.cardId)
      if (!card) return state
      return advanceTurn(playCard(state, currentId, card))
    }
    case 'CPU_PLAY': {
      if (state.phase !== 'playing') return state
      const currentId = state.players[state.turnIdx].id
      if (state.players[state.turnIdx].isHuman) return state
      const card = cpuChooseCard(state, currentId)
      if (!card) return advanceTurn(state)
      return advanceTurn(playCard(state, currentId, card))
    }
    case 'RESTART':
      return initialState()
    default:
      return state
  }
}

const cardName = (c) => {
  if (c.value === 1) return 'Asso'
  if (c.value <= 7) return String(c.value)
  return ['Fante', 'Cavallo', 'Re'][c.value - 8]
}

// ── Componente ──────────────────────────────────────────

const Rubamazzetto = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const playersSession = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const me = useMemo(
    () => playersSession.find((p) => p.id === localPlayerId) ?? playersSession[0],
    [playersSession, localPlayerId]
  )

  const currentPlayer = state.players[state.turnIdx]
  const isMyTurn = currentPlayer?.isHuman && state.phase === 'playing'
  const myHand = state.hands['p0'] || []
  const opponents = state.players.filter((p) => !p.isHuman)

  // Auto-play CPU
  useEffect(() => {
    if (state.phase !== 'playing') return
    if (currentPlayer.isHuman) return
    const t = setTimeout(() => dispatch({ type: 'CPU_PLAY' }), 800)
    return () => clearTimeout(t)
  }, [state.phase, state.turnIdx, currentPlayer])

  const handlePlay = useCallback((cardId) => {
    dispatch({ type: 'PLAY_CARD', cardId })
  }, [])

  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Avversari */}
        <div style={S.opponentsRow}>
          {opponents.map((p) => {
            const pile = state.piles[p.id]
            const handCount = state.hands[p.id].length
            const isCurrent = currentPlayer?.id === p.id
            return (
              <div
                key={p.id}
                style={{ ...S.opponentCell, outline: isCurrent ? `3px solid ${C.accent}` : 'none' }}
              >
                <div style={S.oppHeader}>
                  <MiniBlob color={p.color} size={28} id={`rm-${p.id}`} />
                  <span style={S.oppName}>{p.name}</span>
                  <span style={S.oppHand}>🃏 {handCount}</span>
                </div>
                <div style={S.pileWrap}>
                  {pile.length > 0 ? (
                    <>
                      <CardView card={pile[pile.length - 1]} size="sm" />
                      <span style={S.pileBadge}>{pile.length}</span>
                    </>
                  ) : (
                    <div style={S.emptyPile}>—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tavolo */}
        <div style={S.tavoloArea}>
          <span style={S.tavoloLabel}>🟫 Tavolo</span>
          <div style={S.tavoloCards}>
            {state.tavolo.length === 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Vuoto
              </span>
            )}
            <AnimatePresence>
              {state.tavolo.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  layoutId={`tav-${card.id}`}
                >
                  <CardView card={card} size="sm" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Log */}
        <div style={S.logBox}>
          <AnimatePresence>
            {state.log.slice(-2).map((entry, i) => (
              <motion.div
                key={`${state.log.length - 2 + i}_${entry.slice(0, 12)}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={S.logEntry}
              >
                {entry}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Game over banner */}
        <AnimatePresence>
          {state.phase === 'game_over' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                ...S.resultBanner,
                background: state.winner?.isHuman
                  ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                  : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
              }}
            >
              {state.winner?.isHuman
                ? `🏆 Hai vinto con ${state.counts.find((x) => x.player.id === 'p0').count} carte!`
                : `${state.winner?.name || 'Nessuno'} vince con ${state.counts[0].count} carte.`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mio mazzetto + mano */}
        <div style={S.playerArea}>
          <div style={S.playerHeaderRow}>
            <div style={S.playerHeader}>
              <MiniBlob color={me?.color || '#F59E0B'} size={22} id="rm-me-mini" />
              <span style={S.playerName}>{me?.name || 'Tu'}</span>
              {isMyTurn && <span style={S.yourTurnBadge}>tocca a te</span>}
            </div>
            <div style={S.myPileWrap}>
              {state.piles['p0'].length > 0 ? (
                <>
                  <CardView card={state.piles['p0'][state.piles['p0'].length - 1]} size="xs" />
                  <span style={S.pileBadge}>{state.piles['p0'].length}</span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>0 carte</span>
              )}
            </div>
          </div>

          <div style={S.handRow}>
            {myHand.map((card) => (
              <CardView
                key={card.id}
                card={card}
                size="lg"
                onClick={isMyTurn ? () => handlePlay(card.id) : undefined}
                disabled={!isMyTurn}
              />
            ))}
            {myHand.length === 0 && state.phase === 'playing' && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                Mano vuota — distribuzione in corso...
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={S.footer}>
        {state.phase === 'playing' && !isMyTurn && (
          <p style={S.cpuThinking}>{currentPlayer.name} sta giocando...</p>
        )}
        {state.phase === 'playing' && isMyTurn && (
          <p style={S.cpuThinking}>Tocca una tua carta per giocarla.</p>
        )}
        {state.phase === 'game_over' && (
          <Button
            variant="primary"
            width="full"
            onClick={handleRestart}
            style={accentBtnStyle(C.accent)}
          >
            Nuova partita
          </Button>
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
    background: 'linear-gradient(180deg, #7C2D12 0%, #4C1D0E 100%)',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(8px, 1.5dvh, 16px) clamp(10px, 3vw, 18px)',
    gap: 'clamp(8px, 1.4dvh, 14px)',
    overflow: 'hidden',
    color: '#fff',
  },
  opponentsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: 8,
    flexShrink: 0,
  },
  opponentCell: {
    flex: 1,
    maxWidth: 160,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    background: 'rgba(0,0,0,0.3)',
  },
  oppHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
  },
  oppName: { color: 'rgba(255,255,255,0.85)' },
  oppHand: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 'auto',
  },
  pileWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
  },
  pileBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    background: '#F59E0B',
    color: '#fff',
    fontSize: 11,
    fontWeight: 900,
    padding: '2px 7px',
    borderRadius: 999,
    fontVariantNumeric: 'tabular-nums',
  },
  emptyPile: {
    width: 60, height: 86,
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.3)',
  },
  tavoloArea: {
    flex: 1,
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    border: '1px dashed rgba(255,255,255,0.15)',
  },
  tavoloLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  tavoloCards: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logBox: {
    minHeight: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  logEntry: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
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
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  },
  playerHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 13,
  },
  yourTurnBadge: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 8px',
    background: '#F59E0B',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  myPileWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minHeight: 64,
  },
  handRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
    minHeight: 140,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(10px, 1.8dvh, 16px) clamp(16px, 4vw, 24px) clamp(14px, 2.5dvh, 20px)',
    background: 'rgba(0,0,0,0.3)',
  },
  cpuThinking: {
    margin: 0,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
  },
}

export default Rubamazzetto
