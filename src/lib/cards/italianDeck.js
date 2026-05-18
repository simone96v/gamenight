// Italian 40-card deck library.
// Usato da SetteEMezzo, Briscola, Scopa, Cucù, Rubamazzetto.
// Stateless: tutte le funzioni sono pure, ritornano nuovi array.

export const SUITS = ['denari', 'coppe', 'spade', 'bastoni']

export const SUIT_SYMBOLS = {
  denari: '🪙',
  coppe: '🍷',
  spade: '⚔️',
  bastoni: '🪵',
}

// Colore semantico per il suit (allineato al brand BlobParty quando possibile).
export const SUIT_COLORS = {
  denari: '#D97706',   // ambra (oro)
  coppe: '#DC2626',    // rosso
  spade: '#1F2937',    // grigio scuro
  bastoni: '#15803D',  // verde scuro
}

// Mazzo italiano: 1-7 numerici, 8=Fante, 9=Cavallo, 10=Re.
export const VALUE_LABELS = {
  1: 'Asso', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: 'Fante', 9: 'Cavallo', 10: 'Re',
}

// Versione corta per render compatto sulla card (angolo).
export const SHORT_LABELS = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: 'F', 9: 'C', 10: 'R',
}

// Crea un mazzo nuovo di 40 carte. `id` è stabile per React keys.
export const createDeck = () => {
  const cards = []
  for (const suit of SUITS) {
    for (let value = 1; value <= 10; value++) {
      cards.push({ suit, value, id: `${suit}-${value}` })
    }
  }
  return cards
}

// Fisher-Yates shuffle. Ritorna nuovo array, non muta l'input.
// rng opzionale per test deterministici (default Math.random).
export const shuffle = (deck, rng = Math.random) => {
  const arr = [...deck]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Estrae n carte dalla cima. Ritorna { dealt, rest } senza mutare l'input.
export const draw = (deck, n = 1) => ({
  dealt: deck.slice(0, n),
  rest: deck.slice(n),
})

// Helper: filtra carte di un seme.
export const cardsOfSuit = (cards, suit) => cards.filter((c) => c.suit === suit)

// Helper: trova carta esatta (per id).
export const findById = (cards, id) => cards.find((c) => c.id === id)
