// Briscola — logica pura, condivisa fra modalità solo (vs CPU) e online (2 umani).
// Stateless: tutte le funzioni sono pure, prendono state e ritornano nuovo state.
// Il reducer è generico: accetta playerId nelle azioni così funziona sia in solo
// (un umano + CPU) sia in online (due umani con id qualsiasi).

import { createDeck, shuffle, draw } from '../../lib/cards/italianDeck'

// Strength all'interno di un seme. Più alto = più forte.
export const STRENGTH = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 }
// Valore punti.
export const POINTS = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 }

export const cardPoints = (c) => POINTS[c.value] || 0
export const cardStrength = (c) => STRENGTH[c.value]

// Inizializza una partita Briscola 1v1.
// `players` è un array di [playerId, playerId] (es. ['p0', 'cpu'] per solo o
// ['host_uuid', 'guest_uuid'] per online).
// rng opzionale per test deterministici.
export const initialState = (players = ['p0', 'cpu'], rng = Math.random) => {
  const [pA, pB] = players
  let deck = shuffle(createDeck(), rng)
  const { dealt: handA, rest: r1 } = draw(deck, 3)
  const { dealt: handB, rest: r2 } = draw(r1, 3)
  const { dealt: briscola, rest: r3 } = draw(r2, 1)
  deck = [...r3, briscola[0]]  // briscola in fondo al mazzo

  return {
    deck,
    briscola: briscola[0],
    players: [pA, pB],
    hands: { [pA]: handA, [pB]: handB },
    captures: { [pA]: [], [pB]: [] },
    trick: [],
    leader: pA,                    // chi apre questa presa
    turn: pA,                      // chi deve giocare adesso
    phase: 'playing',              // playing | resolving | game_over
    message: null,
    finalScore: null,
    winner: null,
  }
}

// Determina chi vince la presa correntemente sul tavolo.
export const trickWinner = (trick, briscolaSuit) => {
  const [first, second] = trick
  const firstIsBrisc = first.card.suit === briscolaSuit
  const secondIsBrisc = second.card.suit === briscolaSuit
  if (firstIsBrisc && secondIsBrisc) {
    return cardStrength(first.card) > cardStrength(second.card) ? first.player : second.player
  }
  if (firstIsBrisc) return first.player
  if (secondIsBrisc) return second.player
  if (first.card.suit === second.card.suit) {
    return cardStrength(first.card) > cardStrength(second.card) ? first.player : second.player
  }
  return first.player
}

// CPU sceglie quale carta giocare. `cpuId` è il playerId che impersonifica.
// Usata solo in modalità solo, ma vive qui perché tocca lo stesso state.
export const cpuPickCard = (state, cpuId) => {
  const hand = state.hands[cpuId]
  if (!hand || hand.length === 0) return null
  const briscolaSuit = state.briscola.suit

  if (state.trick.length === 1) {
    const led = state.trick[0].card
    const trickValue = cardPoints(led)
    const winning = hand.filter((c) => {
      const fakeTrick = [...state.trick, { player: cpuId, card: c }]
      return trickWinner(fakeTrick, briscolaSuit) === cpuId
    })
    if (winning.length > 0) {
      if (trickValue >= 10) {
        return winning.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
      }
      const freeWin = winning.filter((c) => cardPoints(c) === 0)
      if (freeWin.length > 0) {
        return freeWin.sort((a, b) => cardStrength(a) - cardStrength(b))[0]
      }
      if (trickValue >= 4) {
        const lowBrisc = winning.filter((c) => c.suit === briscolaSuit && cardPoints(c) === 0)
        if (lowBrisc.length > 0) {
          return lowBrisc.sort((a, b) => cardStrength(a) - cardStrength(b))[0]
        }
      }
    }
    const nonBrisc = hand.filter((c) => c.suit !== briscolaSuit)
    const pool = nonBrisc.length > 0 ? nonBrisc : hand
    return pool.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
  }

  // Apertura: gioca la carta più economica
  const nonBrisc = hand.filter((c) => c.suit !== briscolaSuit)
  const pool = nonBrisc.length > 0 ? nonBrisc : hand
  return pool.sort((a, b) => cardPoints(a) - cardPoints(b) || cardStrength(a) - cardStrength(b))[0]
}

// Applica una giocata: aggiunge la carta alla trick e rimuove dalla mano.
export const applyPlay = (state, playerId, card) => {
  const newHand = state.hands[playerId].filter((c) => c.id !== card.id)
  const newTrick = [...state.trick, { player: playerId, card }]
  return {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    trick: newTrick,
  }
}

// Risolve presa: vincitore raccoglie + entrambi pescano. Fine partita se mani vuote.
export const resolveTrick = (state) => {
  const [pA, pB] = state.players
  const winner = trickWinner(state.trick, state.briscola.suit)
  const loser = winner === pA ? pB : pA
  const trickCards = state.trick.map((t) => t.card)
  const captures = { ...state.captures, [winner]: [...state.captures[winner], ...trickCards] }

  let deck = state.deck
  const newHands = { ...state.hands }
  if (deck.length > 0) {
    const { dealt, rest } = draw(deck, 1)
    newHands[winner] = [...newHands[winner], ...dealt]
    deck = rest
  }
  if (deck.length > 0) {
    const { dealt, rest } = draw(deck, 1)
    newHands[loser] = [...newHands[loser], ...dealt]
    deck = rest
  }

  // Fine partita?
  if (newHands[pA].length === 0 && newHands[pB].length === 0) {
    const aPts = captures[pA].reduce((s, c) => s + cardPoints(c), 0)
    const bPts = captures[pB].reduce((s, c) => s + cardPoints(c), 0)
    let finalWinner
    if (aPts > 60) finalWinner = pA
    else if (bPts > 60) finalWinner = pB
    else if (aPts === 60 && bPts === 60) finalWinner = 'tie'
    else finalWinner = aPts > bPts ? pA : pB
    return {
      ...state,
      hands: newHands,
      deck,
      captures,
      trick: [],
      leader: winner,
      turn: winner,
      phase: 'game_over',
      message: `${winner} vince la presa.`,
      finalScore: { [pA]: aPts, [pB]: bPts },
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
    turn: winner,
    phase: 'playing',
    message: null,
  }
}

// Reducer generico (player-agnostic). Azioni:
//   PLAY_CARD { playerId, cardId } — il giocatore playerId gioca cardId
//   RESOLVE_TRICK — risolve la trick corrente (2 carte sul tavolo)
//   RESET { players, rng } — reinizializza con la lista di player data
export const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state
      if (state.turn !== action.playerId) return state
      const card = state.hands[action.playerId]?.find((c) => c.id === action.cardId)
      if (!card) return state
      const next = applyPlay(state, action.playerId, card)
      if (next.trick.length === 1) {
        const [pA, pB] = state.players
        const other = action.playerId === pA ? pB : pA
        return { ...next, turn: other }
      }
      return { ...next, phase: 'resolving' }
    }
    case 'RESOLVE_TRICK':
      if (state.phase !== 'resolving') return state
      return resolveTrick(state)
    case 'RESET':
      return initialState(action.players, action.rng)
    default:
      return state
  }
}
