// Palette colori per gli avatar dei giocatori.
// L'ordine è significativo: il primo giocatore prende AVATAR_COLORS[0], il secondo [1], ecc.

export const AVATAR_COLORS = [
  '#7C3AED',
  '#0891B2',
  '#D97706',
  '#DC2626',
  '#059669',
  '#DB2777',
  '#2563EB',
  '#EA580C',
]

// Ciclico: dopo l'ottavo riparte da 0 (anche se max giocatori è 8, così nessun caso degenere).
export const pickColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length]
