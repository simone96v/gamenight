// AccessoryPicker — griglia di accessori per personalizzare il blob.

import { motion } from 'framer-motion'
import { ACCESSORIES } from '../utils/accessories'

const AccessoryPicker = ({ selected, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.12 }}
    style={cardStyle}
  >
    <div style={labelStyle}>🎩 Accessorio</div>
    <div style={gridStyle}>
      {ACCESSORIES.map((acc) => {
        const active = selected === acc.id
        return (
          <motion.button
            key={acc.id ?? 'none'}
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => onSelect(acc.id)}
            style={{
              ...btnStyle,
              border: active ? '3px solid var(--text)' : '3px solid transparent',
              boxShadow: active
                ? '0 0 0 3px var(--accent-dim, rgba(139,92,246,0.25)), 0 4px 12px rgba(0,0,0,0.12)'
                : '0 2px 6px rgba(0,0,0,0.06)',
              background: active ? 'var(--accent-dim, rgba(139,92,246,0.08))' : 'var(--bg)',
            }}
          >
            <span style={emojiStyle}>{acc.emoji}</span>
          </motion.button>
        )
      })}
    </div>
  </motion.div>
)

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 'clamp(10px, 1.6dvh, 16px)',
  boxShadow: 'var(--shadow-sm)',
  flexShrink: 0,
}

const labelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 'clamp(6px, 1dvh, 10px)',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 'clamp(6px, 1.2vw, 10px)',
  justifyItems: 'center',
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'clamp(48px, 11vw, 64px)',
  height: 'clamp(48px, 11vw, 64px)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  padding: 0,
  cursor: 'pointer',
}

const emojiStyle = {
  fontSize: 'clamp(22px, 3dvh, 30px)',
  lineHeight: 1,
}

export default AccessoryPicker
