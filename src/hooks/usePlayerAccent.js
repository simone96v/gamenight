// Hook che restituisce la palette di colori basata sul blob scelto dal giocatore locale.
// Ritorna un oggetto con la stessa forma di GAME_COLORS[game], così è un drop-in replacement.

import { useSession } from '../stores/useSession'
import { playerPalette } from '../theme/gameColors'

export function usePlayerAccent() {
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const player = players.find((p) => p.id === localPlayerId)
  return playerPalette(player?.color)
}
