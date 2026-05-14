// Palette colori per gli avatar dei giocatori.
// L'ordine è significativo: il primo giocatore prende AVATAR_COLORS[0], il secondo [1], ecc.

export const AVATAR_COLORS = [
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#F43F5E',
  '#3B82F6',
  '#F97316',
  '#06B6D4',
  '#EC4899',
]

// Ciclico: dopo l'ottavo riparte da 0 (anche se max giocatori è 8, così nessun caso degenere).
export const pickColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length]

export const BLOB_GRADIENTS = {
  '#8B5CF6': ['#C4B5FD', '#A78BFA', '#8B5CF6'],
  '#F59E0B': ['#FDE68A', '#FBBF24', '#F59E0B'],
  '#10B981': ['#6EE7B7', '#34D399', '#10B981'],
  '#F43F5E': ['#FDA4AF', '#FB7185', '#F43F5E'],
  '#3B82F6': ['#93C5FD', '#60A5FA', '#3B82F6'],
  '#F97316': ['#FDBA74', '#FB923C', '#F97316'],
  '#06B6D4': ['#67E8F9', '#22D3EE', '#06B6D4'],
  '#EC4899': ['#F9A8D4', '#F472B6', '#EC4899'],
}

export const GRAY_GRADIENT = ['#E5E7EB', '#D1D5DB', '#9CA3AF']
