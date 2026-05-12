// Riga orizzontale di PlayerAvatar — mostra tutti i giocatori con i loro punteggi.
// Scorre orizzontalmente solo se ce ne sono troppi (max 8 — di norma stanno in larghezza).
//
// Props:
//   players: array
//   currentIdx: indice del giocatore di turno (-1 per nessuno)
//   answeredIds: Set<string> | string[] — opzionale; chi non è nel set diventa "dimmed"
//   size: passata a PlayerAvatar
//   showScore: passata a PlayerAvatar

import PlayerAvatar from './PlayerAvatar'

const PlayerStrip = ({
  players = [],
  currentIdx = -1,
  answeredIds,
  size = 'md',
  showScore = true,
}) => {
  const hasFilter = answeredIds != null
  const answeredSet = hasFilter
    ? (answeredIds instanceof Set ? answeredIds : new Set(answeredIds))
    : null

  return (
    <div
      className="flex items-start overflow-x-auto scrollable-list"
      style={{
        gap: 'clamp(8px, 1.5dvh, 16px)',
        paddingBottom: 4,
      }}
    >
      {players.map((p, i) => {
        const dimmed = hasFilter ? !answeredSet.has(p.id) : false
        return (
          <PlayerAvatar
            key={p.id}
            player={p}
            highlighted={i === currentIdx}
            dimmed={dimmed}
            size={size}
            showScore={showScore}
          />
        )
      })}
    </div>
  )
}

export default PlayerStrip
