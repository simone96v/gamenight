// LobbySegmented — pattern "domanda + selettore" usato nelle lobby dei giochi.
// Layout: label in alto, riga di pulsanti equi-larghi sotto (stile Mappa).
//
// Props:
//   label        stringa della domanda
//   options      array; ogni opzione può essere:
//                  - numero/stringa (es. 5)
//                  - oggetto { id, label, emoji?, color? }
//                    - color: override colore active (es. per Difficoltà di Mappa)
//   value        id/valore corrente (confronto strict)
//   onChange     (newValue) => void
//   accent       hex/var colore accent (default var(--accent))
//   accentShadow rgba per glow active (opzionale)
//   disabled     boolean

import { motion } from 'framer-motion'

const SPRING = { type: 'spring', stiffness: 400, damping: 22 }

const optKey = (o) => (o && typeof o === 'object' ? o.id : o)
const optLabel = (o) => (o && typeof o === 'object' ? o.label : String(o))
const optEmoji = (o) => (o && typeof o === 'object' ? o.emoji : null)
const optColor = (o, fallback) => (o && typeof o === 'object' && o.color ? o.color : fallback)

const LobbySegmented = ({
  label,
  options = [],
  value,
  onChange,
  accent = 'var(--accent)',
  accentShadow,
  disabled = false,
}) => (
  <div style={S.wrap}>
    {label && <span style={S.label}>{label}</span>}
    <div style={S.row}>
      {options.map((opt) => {
        const key = optKey(opt)
        const active = key === value
        const activeColor = optColor(opt, accent)
        const emoji = optEmoji(opt)
        const text = optLabel(opt)
        const handle = () => { if (!disabled) onChange?.(key) }
        return (
          <motion.button
            key={key}
            type="button"
            onClick={handle}
            disabled={disabled}
            whileHover={disabled ? undefined : { y: -2 }}
            whileTap={disabled ? undefined : { y: 0, scale: 0.95 }}
            transition={SPRING}
            style={{
              ...S.btn,
              ...(emoji ? S.btnWithIcon : null),
              background: active ? activeColor : 'var(--surface)',
              color: active ? '#fff' : 'var(--text)',
              border: active
                ? `2px solid ${activeColor}`
                : '2px solid var(--border)',
              boxShadow: active
                ? `0 4px 12px ${accentShadow || 'rgba(0,0,0,0.18)'}`
                : '0 2px 6px rgba(0,0,0,0.04)',
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            {emoji && <span style={S.emoji}>{emoji}</span>}
            <span>{text}</span>
          </motion.button>
        )
      })}
    </div>
  </div>
)

const S = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(6px, 1dvh, 10px)',
  },
  label: {
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 800,
    color: 'var(--text)',
  },
  row: {
    display: 'flex',
    gap: 'clamp(6px, 1.4vw, 10px)',
  },
  btn: {
    flex: 1,
    minWidth: 0,
    padding: 'clamp(10px, 1.8dvh, 16px) 4px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'clamp(15px, 2dvh, 19px)',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.01em',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnWithIcon: {
    fontSize: 'clamp(12px, 1.5dvh, 14px)',
  },
  emoji: {
    fontSize: 14,
    lineHeight: 1,
  },
}

export default LobbySegmented
