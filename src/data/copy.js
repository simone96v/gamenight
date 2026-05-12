// Testi variabili che cambiano in base alla categoria selezionata.
// Per ogni categoria definisce stringhe di UI (CTA, banner, ecc) che la app legge a runtime.
// Tenere tutto qui evita stringhe hard-coded sparse nelle screen.

export const COPY = {
  gamenight: {
    lobbyTitle: 'Chi gioca stasera?',
    startCTA: 'Inizia la sfida',
    roundEnd: 'Round finito',
  },
  bar: {
    lobbyTitle: 'Chi è ancora sobrio?',
    startCTA: 'Cin cin',
    roundEnd: 'Round finito',
  },
  couple: {
    lobbyTitle: 'Solo io e te',
    startCTA: 'Iniziamo',
    roundEnd: 'Mostra le carte',
  },
  wild: {
    lobbyTitle: 'Chi ha il coraggio?',
    startCTA: 'Si parte',
    roundEnd: 'Esecuzione',
  },
}

// Lookup helper con fallback a gamenight in caso di categoria sconosciuta.
export const getCopy = (categoryId) => COPY[categoryId] ?? COPY.gamenight
