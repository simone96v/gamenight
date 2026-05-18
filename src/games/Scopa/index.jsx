// Scopa — 1v1 vs CPU. MVP single-player.
// Regole MVP (classica 1v1):
//   - 3 carte a ciascuno + 4 sul tavolo.
//   - A turni si gioca 1 carta:
//     a) Se matcha singola carta del tavolo per valore → prende quella + la tua.
//     b) Altrimenti se la somma di una combinazione del tavolo = valore della
//        tua → prende quella combinazione + la tua.
//     c) Se single E combinazioni esistono → SOLO single (regola classica).
//     d) Multiple combinazioni → auto-pick: max carte, poi max denari.
//     e) Nessun match → carta va sul tavolo.
//   - Dopo presa: se tavolo vuoto → SCOPA (+1 pt; eccetto ultima mano).
//   - Mani esaurite → si distribuiscono 3 nuove (a entrambi).
//   - Fine: mazzo + mani vuoti → carte tavolo al last taker.
//   - Punti finali (max 4 punti + scope):
//     1) Carte: più carte
//     2) Denari: più carte di denari
//     3) Settebello: 7 di denari
//     4) Primiera: somma valori primiera carta più alta per seme
//     5) Scope: +1 per ogni scopa fatta

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

// Primiera: valore di ciascuna carta nel computo del Primiera point.
const PRIMIERA = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 }

// ── Subset-sum helper: trova tutte le combinazioni di `cards` che sommano a `target`.
const findCombinations = (cards, target) => {
  const results = []
  const helper = (i, remaining, current) => {
    if (remaining === 0 && current.length > 0) {
      results.push(current)
      return
    }
    if (i >= cards.length || remaining < 0) return
    helper(i + 1, remaining - cards[i].value, [...current, cards[i]])
    helper(i + 1, remaining, current)
  }
  helper(0, target, [])
  return results
}

// Auto-pick best combination quando ci sono multiple opzioni:
// preferisci 7 di denari (settebello), poi più denari, poi più carte.
const pickBestCombo = (combos) => {
  return combos.sort((a, b) => {
    const aSette = a.some((c) => c.value === 7 && c.suit === 'denari') ? 1 : 0
    const bSette = b.some((c) => c.value === 7 && c.suit === 'denari') ? 1 : 0
    if (aSette !== bSette) return bSette - aSette
    const aDen = a.filter((c) => c.suit === 'denari').length
    const bDen = b.filter((c) => c.suit === 'denari').length
    if (aDen !== bDen) return bDen - aDen
    return b.length - a.length  // più carte meglio (per "carte")
  })[0]
}

// ── State init ──────────────────────────────────────────

const initialState = () => {
  let deck = shuffle(createDeck())
  const { dealt: pHand, rest: r1 } = draw(deck, 3)
  const { dealt: cHand, rest: r2 } = draw(r1, 3)
  const { dealt: table, rest: r3 } = draw(r2, 4)
  deck = r3
  return {
    deck,
    hands: { p0: pHand, cpu: cHand },
    table,
    captures: { p0: [], cpu: [] },
    scope: { p0: 0, cpu: 0 },
    turn: 'p0',
    lastTaker: null,
    phase: 'playing',  // playing | resolving | game_over
    lastMove: null,    // { player, card, captured, scopa } for feedback
  }
}

// ── Game actions ───────────────────────────────────────

// Esegue la giocata di `card` da parte di `playerId`.
const playCard = (state, playerId, card) => {
  const newHand = state.hands[playerId].filter((c) => c.id !== card.id)
  // Single match?
  const singles = state.table.filter((c) => c.value === card.value)
  let captured = null

  if (singles.length === 1) {
    captured = [singles[0]]
  } else if (singles.length > 1) {
    // Regola classica: con due single la presa va sulla prima (il giocatore può
    // sceglierla in vita reale; per MVP prendiamo la prima trovata, preservando
    // gli altri sul tavolo).
    captured = [singles[0]]
  } else {
    // Cerca combinazioni che sommano al valore della carta.
    const combos = findCombinations(state.table, card.value)
    if (combos.length > 0) {
      captured = pickBestCombo(combos)
    }
  }

  if (!captured) {
    return {
      ...state,
      hands: { ...state.hands, [playerId]: newHand },
      table: [...state.table, card],
      lastMove: { player: playerId, card, captured: null, scopa: false },
    }
  }

  // Removed captured from table, add to player's pile (+ played card).
  const capIds = new Set(captured.map((c) => c.id))
  const newTable = state.table.filter((c) => !capIds.has(c.id))
  const newCaptures = {
    ...state.captures,
    [playerId]: [...state.captures[playerId], ...captured, card],
  }

  // Scopa? Tavolo vuoto + non è la ULTIMA giocata dell'intera partita.
  // (Non possiamo sapere se è l'ultima qui; serve un check post-deal.)
  // Per MVP semplice: niente scopa se entrambi avranno hand=0 e mazzo=0 dopo.
  // Approssimazione: niente scopa se mazzo vuoto E (la mia mano dopo) = 0 E
  // (la mano dell'avversario) = 0.
  const wouldEndGame = newTable.length === 0
    && state.deck.length === 0
    && newHand.length === 0
    && state.hands[playerId === 'p0' ? 'cpu' : 'p0'].length === 0
  const isScopa = newTable.length === 0 && !wouldEndGame

  const newScope = isScopa
    ? { ...state.scope, [playerId]: state.scope[playerId] + 1 }
    : state.scope

  return {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    table: newTable,
    captures: newCaptures,
    scope: newScope,
    lastTaker: playerId,
    lastMove: { player: playerId, card, captured, scopa: isScopa },
  }
}

// Avanza turno: se entrambe mani vuote e deck non vuoto → ridistribuisci.
// Se tutto vuoto → end game.
const advance = (state) => {
  const next = state.turn === 'p0' ? 'cpu' : 'p0'

  const bothEmpty = state.hands.p0.length === 0 && state.hands.cpu.length === 0
  if (bothEmpty) {
    if (state.deck.length === 0) {
      return endGame(state)
    }
    // Ridistribuisci 3 a ciascuno (o quanto resta).
    let d = state.deck
    const newHands = { p0: [], cpu: [] }
    for (const pid of ['p0', 'cpu']) {
      const n = Math.min(3, d.length)
      const { dealt, rest } = draw(d, n)
      newHands[pid] = dealt
      d = rest
      if (d.length === 0) break
    }
    return { ...state, deck: d, hands: newHands, turn: next, phase: 'playing' }
  }

  return { ...state, turn: next, phase: 'playing' }
}

// Calcolo punti finali e fine partita.
const endGame = (state) => {
  // Carte rimaste sul tavolo vanno all'ultimo che ha preso.
  const finalCaptures = { ...state.captures }
  if (state.lastTaker && state.table.length > 0) {
    finalCaptures[state.lastTaker] = [...finalCaptures[state.lastTaker], ...state.table]
  }

  const score = computeScore(finalCaptures, state.scope)
  return {
    ...state,
    captures: finalCaptures,
    table: [],
    phase: 'game_over',
    finalScore: score,
  }
}

const computeScore = (captures, scope) => {
  const stat = (cards) => {
    const denari = cards.filter((c) => c.suit === 'denari')
    const settebello = cards.some((c) => c.suit === 'denari' && c.value === 7)
    // Primiera: carta più alta per seme. Solo semi con almeno 1 carta contano.
    let prim = 0
    for (const suit of ['denari', 'coppe', 'spade', 'bastoni']) {
      const ofSuit = cards.filter((c) => c.suit === suit)
      if (ofSuit.length === 0) continue
      let best = 0
      for (const c of ofSuit) {
        const v = PRIMIERA[c.value] || 0
        if (v > best) best = v
      }
      prim += best
    }
    return { count: cards.length, denari: denari.length, settebello, prim }
  }
  const a = stat(captures.p0)
  const b = stat(captures.cpu)
  const points = { p0: 0, cpu: 0, breakdown: [] }

  // Carte
  if (a.count > b.count) { points.p0++; points.breakdown.push(['Carte', 'p0', a.count, b.count]) }
  else if (b.count > a.count) { points.cpu++; points.breakdown.push(['Carte', 'cpu', a.count, b.count]) }
  else points.breakdown.push(['Carte', 'pari', a.count, b.count])

  // Denari
  if (a.denari > b.denari) { points.p0++; points.breakdown.push(['Denari', 'p0', a.denari, b.denari]) }
  else if (b.denari > a.denari) { points.cpu++; points.breakdown.push(['Denari', 'cpu', a.denari, b.denari]) }
  else points.breakdown.push(['Denari', 'pari', a.denari, b.denari])

  // Settebello
  if (a.settebello) { points.p0++; points.breakdown.push(['Settebello', 'p0', '✓', '']) }
  else if (b.settebello) { points.cpu++; points.breakdown.push(['Settebello', 'cpu', '', '✓']) }

  // Primiera
  if (a.prim > b.prim) { points.p0++; points.breakdown.push(['Primiera', 'p0', a.prim, b.prim]) }
  else if (b.prim > a.prim) { points.cpu++; points.breakdown.push(['Primiera', 'cpu', a.prim, b.prim]) }
  else points.breakdown.push(['Primiera', 'pari', a.prim, b.prim])

  // Scope
  if (scope.p0 > 0) { points.p0 += scope.p0; points.breakdown.push([`Scope`, 'p0', scope.p0, scope.cpu]) }
  if (scope.cpu > 0) { points.cpu += scope.cpu; points.breakdown.push([`Scope`, 'cpu', scope.p0, scope.cpu]) }

  return points
}

// CPU AI: pick la carta che produce la presa "migliore".
// Heuristica:
//   - Se posso prendere il settebello (7 di denari) → priorità massima.
//   - Altrimenti scegli la mossa che prende più carte di denari.
//   - In assenza di prese → scarta carta che è più sicura (valore basso, no denari).
const cpuPickMove = (state) => {
  const hand = state.hands.cpu
  if (hand.length === 0) return null

  let best = null
  let bestScore = -Infinity
  for (const card of hand) {
    // Simula la presa
    const singles = state.table.filter((c) => c.value === card.value)
    let captured
    if (singles.length >= 1) {
      captured = [singles[0]]
    } else {
      const combos = findCombinations(state.table, card.value)
      captured = combos.length > 0 ? pickBestCombo(combos) : null
    }
    let score = 0
    if (captured) {
      // Bonus per ogni cattura
      score += 10
      // Bonus per denari
      score += captured.filter((c) => c.suit === 'denari').length * 5
      // Bonus per settebello catturato
      if (captured.some((c) => c.suit === 'denari' && c.value === 7)) score += 50
      // Bonus per scopa potenziale
      if (state.table.length === captured.length) score += 20
    } else {
      // Penalità per carta lasciata sul tavolo: peggio se è denari o alto valore
      score -= card.suit === 'denari' ? 8 : 2
      if (card.value === 7 && card.suit === 'denari') score -= 30  // mai dare il settebello
      score -= card.value * 0.5  // preferisci scartare basse
    }
    if (score > bestScore) {
      bestScore = score
      best = card
    }
  }
  return best
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAYER_PLAY': {
      if (state.phase !== 'playing' || state.turn !== 'p0') return state
      const card = state.hands.p0.find((c) => c.id === action.cardId)
      if (!card) return state
      return { ...playCard(state, 'p0', card), phase: 'resolving' }
    }
    case 'CPU_PLAY': {
      if (state.phase !== 'playing' || state.turn !== 'cpu') return state
      const card = cpuPickMove(state)
      if (!card) return state
      return { ...playCard(state, 'cpu', card), phase: 'resolving' }
    }
    case 'ADVANCE_TURN':
      if (state.phase !== 'resolving') return state
      return advance({ ...state, lastMove: null })
    case 'RESTART':
      return initialState()
    default:
      return state
  }
}

// ── Componente ──────────────────────────────────────────

const Scopa = () => {
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
    if (state.phase !== 'playing' || state.turn !== 'cpu') return
    const t = setTimeout(() => dispatch({ type: 'CPU_PLAY' }), 1000)
    return () => clearTimeout(t)
  }, [state.phase, state.turn])

  // Advance dopo resolving
  useEffect(() => {
    if (state.phase !== 'resolving') return
    const t = setTimeout(() => dispatch({ type: 'ADVANCE_TURN' }), 1300)
    return () => clearTimeout(t)
  }, [state.phase])

  const handlePlay = useCallback((cardId) => dispatch({ type: 'PLAYER_PLAY', cardId }), [])
  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  const cpuColor = pickColor(2)
  const isMyTurn = state.turn === 'p0' && state.phase === 'playing'

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* CPU */}
        <div style={S.opRow}>
          <div style={S.opHeader}>
            <MiniBlob color={cpuColor} size={28} id="sc-cpu" />
            <span style={S.opName}>CPU</span>
            <span style={S.scopeBadge}>🧹 {state.scope.cpu}</span>
            <span style={S.opHand}>🃏 {state.hands.cpu.length}</span>
            <span style={S.opPile}>📦 {state.captures.cpu.length}</span>
          </div>
          <div style={S.cpuHandRow}>
            {state.hands.cpu.map((c) => <CardView key={c.id} faceDown size="xs" />)}
          </div>
        </div>

        {/* Table */}
        <div style={S.tableArea}>
          <div style={S.tableInfoRow}>
            <span style={S.tableLabel}>🟫 Tavolo</span>
            <span style={S.deckCounter}>Mazzo: {state.deck.length}</span>
          </div>
          <div style={S.tableCards}>
            <AnimatePresence>
              {state.table.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <CardView card={c} size="sm" />
                </motion.div>
              ))}
            </AnimatePresence>
            {state.table.length === 0 && state.phase !== 'game_over' && (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Tavolo vuoto</span>
            )}
          </div>
        </div>

        {/* Last move feedback */}
        <AnimatePresence>
          {state.lastMove && state.phase === 'resolving' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={S.moveFeedback}
            >
              {state.lastMove.player === 'p0' ? 'Hai giocato' : 'CPU ha giocato'}
              {state.lastMove.captured ? ` e preso ${state.lastMove.captured.length} carte` : ', tavolo'}
              {state.lastMove.scopa && ' 🧹 SCOPA!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over */}
        <AnimatePresence>
          {state.phase === 'game_over' && state.finalScore && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                ...S.resultBanner,
                background: state.finalScore.p0 > state.finalScore.cpu
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : state.finalScore.p0 === state.finalScore.cpu
                  ? 'linear-gradient(90deg, #6B7280, #9CA3AF)'
                  : 'linear-gradient(90deg, #EF4444, #F87171)',
              }}
            >
              <div>
                {state.finalScore.p0 > state.finalScore.cpu
                  ? `🏆 Vinci ${state.finalScore.p0} a ${state.finalScore.cpu}`
                  : state.finalScore.p0 === state.finalScore.cpu
                  ? `🤝 Pareggio ${state.finalScore.p0}-${state.finalScore.cpu}`
                  : `😬 CPU vince ${state.finalScore.cpu} a ${state.finalScore.p0}`}
              </div>
              <div style={S.breakdownList}>
                {state.finalScore.breakdown.map((row, i) => (
                  <div key={i} style={S.breakdownRow}>
                    <span>{row[0]}</span>
                    <span style={{
                      color: row[1] === 'p0' ? '#10B981' : row[1] === 'cpu' ? '#FCA5A5' : 'rgba(255,255,255,0.7)',
                      fontWeight: 700,
                    }}>
                      {row[1] === 'pari' ? `${row[2]} = ${row[3]}` : `${row[2]} vs ${row[3]}`}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Me */}
        <div style={S.meRow}>
          <div style={S.opHeader}>
            <MiniBlob color={me?.color || '#F59E0B'} size={28} id="sc-me" />
            <span style={S.opName}>{me?.name || 'Tu'}</span>
            <span style={S.scopeBadge}>🧹 {state.scope.p0}</span>
            <span style={S.opHand}>🃏 {state.hands.p0.length}</span>
            <span style={S.opPile}>📦 {state.captures.p0.length}</span>
            {isMyTurn && <span style={S.yourTurnBadge}>tocca a te</span>}
          </div>
          <div style={S.myHandRow}>
            {state.hands.p0.map((c) => (
              <CardView
                key={c.id}
                card={c}
                size="md"
                onClick={isMyTurn ? () => handlePlay(c.id) : undefined}
                disabled={!isMyTurn}
              />
            ))}
          </div>
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
            {isMyTurn ? 'Scegli una carta.' : 'CPU sta pensando...'}
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
    background: 'linear-gradient(180deg, #14532D 0%, #052E16 100%)',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(8px, 1.4dvh, 12px) clamp(10px, 3vw, 16px)',
    gap: 'clamp(6px, 1.2dvh, 10px)',
    overflow: 'auto',
    color: '#fff',
  },
  opRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  meRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  opHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  opName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 13,
  },
  scopeBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.4)',
  },
  opHand: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  opPile: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  yourTurnBadge: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 8px',
    background: '#F59E0B',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  cpuHandRow: {
    display: 'flex',
    gap: 3,
    justifyContent: 'center',
  },
  tableArea: {
    flex: 1,
    minHeight: 110,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 8,
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    border: '1px dashed rgba(255,255,255,0.15)',
  },
  tableInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  deckCounter: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
  },
  tableCards: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveFeedback: {
    alignSelf: 'center',
    background: 'rgba(0,0,0,0.6)',
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  resultBanner: {
    alignSelf: 'center',
    padding: '12px 18px',
    borderRadius: 14,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 14,
    textAlign: 'center',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    color: '#fff',
    minWidth: 280,
    maxWidth: 360,
  },
  breakdownList: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontFamily: 'system-ui',
    fontWeight: 600,
    fontSize: 12,
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  myHandRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    minHeight: 110,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(10px, 1.8dvh, 16px) clamp(16px, 4vw, 24px) clamp(14px, 2.5dvh, 20px)',
    background: 'rgba(0,0,0,0.3)',
  },
  footerHint: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
}

export default Scopa
