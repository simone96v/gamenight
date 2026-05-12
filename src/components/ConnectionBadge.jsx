// Pallino di stato connessione Supabase. Posizionato dentro AppHeader.
// Stati:
//   'connecting'   → giallo (--warning), pulse
//   'connected'    → verde  (--success)
//   'disconnected' → rosso  (--danger)
//   'idle'         → non renderizzare nulla
// Il valore di status viene calcolato in useRoomSync (App.jsx) e propagato come prop.

const COLOR = {
  connecting:   'var(--warning)',
  connected:    'var(--success)',
  disconnected: 'var(--danger)',
}

const LABEL = {
  connecting:   'Connessione in corso',
  connected:    'Connesso',
  disconnected: 'Disconnesso',
}

const ConnectionBadge = ({ status = 'idle' }) => {
  if (status === 'idle' || !COLOR[status]) return null
  return (
    <div
      role="status"
      aria-label={LABEL[status]}
      className={`rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}`}
      style={{
        width: 10,
        height: 10,
        background: COLOR[status],
        boxShadow: `0 0 0 2px color-mix(in srgb, ${COLOR[status]} 25%, transparent)`,
      }}
    />
  )
}

export default ConnectionBadge
