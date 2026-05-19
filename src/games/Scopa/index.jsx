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

import { useReducer, useCallback, useEffect, useMemo, useState } from 'react'
import { cardTableTheme } from '../_shared/cardTableTheme'
import { HelpModal, TableBox } from '../_shared/CardGameUI'
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
    phase: 'playing',  // playing | choose_take | resolving | game_over
    lastMove: null,    // { player, card, captured, scopa } for feedback
    pendingChoice: null, // { card, options } quando il player deve scegliere
  }
}

// ── Game actions ───────────────────────────────────────

// Calcola tutte le opzioni di presa disponibili giocando `card` sul `table`.
// Regola classica: se ci sono single match per valore, si DEVE prendere un
// single (no combo). Le combo si attivano solo se non ci sono single.
// Ritorna array di "option", ognuna è un array di carte da prendere.
//   - [] vuoto: nessuna presa, la carta va sul tavolo
//   - 1 elemento: presa unica, no scelta richiesta
//   - 2+ elementi: il giocatore deve scegliere quale opzione prendere
const computeTakeOptions = (table, card) => {
  const singles = table.filter((c) => c.value === card.value)
  if (singles.length > 0) {
    // Single hanno priorità: ogni single è un'opzione.
    return singles.map((c) => [c])
  }
  // Solo se non ci sono single, considera le combinazioni di somma.
  return findCombinations(table, card.value)
}

// Esegue la presa scelta sullo state e ritorna il nuovo state.
const applyTake = (state, playerId, card, captured) => {
  const newHand = state.hands[playerId].filter((c) => c.id !== card.id)

  if (!captured || captured.length === 0) {
    return {
      ...state,
      hands: { ...state.hands, [playerId]: newHand },
      table: [...state.table, card],
      lastMove: { player: playerId, card, captured: null, scopa: false },
    }
  }

  const capIds = new Set(captured.map((c) => c.id))
  const newTable = state.table.filter((c) => !capIds.has(c.id))
  const newCaptures = {
    ...state.captures,
    [playerId]: [...state.captures[playerId], ...captured, card],
  }

  // Scopa: tavolo vuoto post-presa, ma non se è l'ultima giocata della partita.
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
// CPU sceglie carta + opzione di presa migliori.
// Heuristica score:
//   - +10 per ogni presa, +5/carta denari, +50 settebello, +20 scopa potenziale
//   - -8 per scartare denari, -30 per scartare il 7 denari, -0.5*value
// Ritorna { card, captured } pronti per applyTake.
const cpuPickMove = (state) => {
  const hand = state.hands.cpu
  if (hand.length === 0) return null

  let best = null
  let bestScore = -Infinity
  for (const card of hand) {
    const options = computeTakeOptions(state.table, card)
    // CPU considera ogni opzione separatamente e prende la migliore
    if (options.length > 0) {
      for (const captured of options) {
        let score = 10
        score += captured.filter((c) => c.suit === 'denari').length * 5
        if (captured.some((c) => c.suit === 'denari' && c.value === 7)) score += 50
        if (state.table.length === captured.length) score += 20
        if (score > bestScore) {
          bestScore = score
          best = { card, captured }
        }
      }
    } else {
      // Carta sul tavolo: penalità
      let score = 0
      score -= card.suit === 'denari' ? 8 : 2
      if (card.value === 7 && card.suit === 'denari') score -= 30
      score -= card.value * 0.5
      if (score > bestScore) {
        bestScore = score
        best = { card, captured: null }
      }
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

      const options = computeTakeOptions(state.table, card)

      // Più di un'opzione → richiedi scelta utente
      if (options.length > 1) {
        return {
          ...state,
          phase: 'choose_take',
          pendingChoice: { card, options },
        }
      }
      // 0 o 1 opzione → auto-applica
      const captured = options[0] || null
      return { ...applyTake(state, 'p0', card, captured), phase: 'resolving' }
    }

    case 'CHOOSE_TAKE': {
      if (state.phase !== 'choose_take' || !state.pendingChoice) return state
      const { card, options } = state.pendingChoice
      const captured = options[action.choiceIdx] || options[0]
      return {
        ...applyTake(state, 'p0', card, captured),
        phase: 'resolving',
        pendingChoice: null,
      }
    }

    case 'CPU_PLAY': {
      if (state.phase !== 'playing' || state.turn !== 'cpu') return state
      const move = cpuPickMove(state)
      if (!move) return state
      return { ...applyTake(state, 'cpu', move.card, move.captured), phase: 'resolving' }
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
  const [helpOpen, setHelpOpen] = useState(false)
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

  // Fine partita → SoloEndScreen con breakdown punteggio Scopa
  if (state.phase === 'game_over' && state.finalScore) {
    const won = state.finalScore.p0 > state.finalScore.cpu
    const tied = state.finalScore.p0 === state.finalScore.cpu
    const breakdown = state.finalScore.breakdown || []
    // Compact 4 stat chips: esito + 3 voci principali (carte, denari, primiera)
    const compactStats = [
      { label: 'esito', value: tied ? '🤝 Pareggio' : won ? '🏆 Vittoria' : '😬 Sconfitta' },
      { label: 'CPU', value: state.finalScore.cpu },
      ...breakdown
        .filter((r) => ['Carte', 'Denari', 'Settebello', 'Primiera', 'Scope'].includes(r[0]))
        .slice(0, 3)
        .map((r) => ({
          label: r[0],
          value: r[1] === 'p0' ? `✓ ${r[2]}` : r[1] === 'cpu' ? `${r[3]} CPU` : `${r[2]}=${r[3]}`,
        })),
    ]
    return (
      <SoloEndScreen
        gameEmoji="🧹"
        gameName="Scopa"
        player={me}
        primaryValue={state.finalScore.p0}
        primaryLabel="punti"
        stats={compactStats}
        onReplay={handleRestart}
        onChangeGame={handleExit}
      />
    )
  }

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
        actions={<IconButton ariaLabel="Regole" onClick={() => setHelpOpen(true)}>?</IconButton>}
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

        {/* Table — box dimensioni fisse (170) */}
        <TableBox label="🟫 Tavolo" info={`Mazzo: ${state.deck.length}`}>
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
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Tavolo vuoto</span>
          )}
        </TableBox>

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

        {/* Choose-take overlay: appare quando il player ha più opzioni di presa */}
        <AnimatePresence>
          {state.phase === 'choose_take' && state.pendingChoice && (
            <ChooseTakeOverlay
              card={state.pendingChoice.card}
              options={state.pendingChoice.options}
              onChoose={(idx) => dispatch({ type: 'CHOOSE_TAKE', choiceIdx: idx })}
            />
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
                      color: row[1] === 'p0' ? '#10B981' : row[1] === 'cpu' ? '#EF4444' : 'rgba(255,255,255,0.7)',
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
          <GameButton variant="primary" accent={C.accent} icon="🔁" onClick={handleRestart}>
            Nuova partita
          </GameButton>
        ) : (
          <p style={S.footerHint}>
            {isMyTurn ? 'Scegli una carta.' : 'CPU sta pensando...'}
          </p>
        )}
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} emoji="🧹" title="Regole Scopa">
        <p style={{ margin: '0 0 12px' }}>
          <strong>Obiettivo:</strong> raccogliere più carte e fare il punteggio più alto.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          A ogni turno giochi una carta. Se matcha (per valore singolo o per somma di una
          combinazione del tavolo) <strong>prendi</strong> quelle carte + la tua nel tuo mazzetto.
          Niente match → carta sul tavolo.
        </p>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Scopa:</p>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
          Quando svuoti il tavolo con una presa, hai fatto <strong>scopa</strong>: +1 punto
          (eccetto l'ultima giocata della partita).
        </p>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Punti finali:</p>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
          1. <strong>Carte</strong> — più carte (+1 pt)<br/>
          2. <strong>Denari</strong> — più carte di denari (+1 pt)<br/>
          3. <strong>Settebello</strong> — il 7 di denari (+1 pt)<br/>
          4. <strong>Primiera</strong> — somma valori primiera (Asso=16, 2=12, 3=13, 4=14, 5=15, 6=18, 7=21, figure=10) (+1 pt)<br/>
          5. <strong>Scope</strong> — 1 pt per ogni scopa
        </p>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
          Massimo possibile: 4 punti base + scope. Le carte residue sul tavolo a fine partita
          vanno all'ultimo che ha preso.
        </p>
      </HelpModal>
    </div>
  )
}

// ── ChooseTakeOverlay ──────────────────────────────────────
// Quando il giocatore ha più opzioni di presa (es. 2 carte stesso valore sul
// tavolo, o più combinazioni di somma), mostra un overlay con le opzioni.
// Tap su un'opzione → dispatch CHOOSE_TAKE.
const ChooseTakeOverlay = ({ card, options, onChoose }) => {
  const explainOption = (opt) => {
    const hasDenari = opt.some((c) => c.suit === 'denari')
    const hasSettebello = opt.some((c) => c.suit === 'denari' && c.value === 7)
    const tags = []
    if (hasSettebello) tags.push('✨ Settebello')
    if (hasDenari && !hasSettebello) tags.push(`💰 ${opt.filter((c) => c.suit === 'denari').length} denari`)
    if (opt.length > 1) tags.push(`${opt.length} carte`)
    return tags.join(' · ')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: 20,
          borderRadius: 18,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <CardView card={card} size="sm" />
          <div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
              Scegli cosa prendere
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Più opzioni disponibili — tocca quella che preferisci.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, idx) => (
            <motion.button
              key={idx}
              type="button"
              whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChoose(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'color-mix(in srgb, var(--text) 4%, var(--surface))',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 12,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {opt.map((c) => (
                  <CardView key={c.id} card={c} size="xs" />
                ))}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>
                {explainOption(opt) || `${opt.length} carta${opt.length > 1 ? 'e' : ''}`}
              </div>
              <span style={{ fontSize: 18 }}>→</span>
            </motion.button>
          ))}
        </div>
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
    background: 'var(--surface)',
  },
  opHand: { fontSize: 11, color: 'var(--muted)' },
  opPile: { fontSize: 11, color: 'var(--muted)' },
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
  // tableArea / tableLabel / tableCards / deckCounter spostati in TableBox condiviso
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
    background: 'var(--surface)',
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

export default Scopa
