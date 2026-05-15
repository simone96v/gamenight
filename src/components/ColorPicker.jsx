// ColorPicker — griglia 2×4 di MiniBlob per scegliere il colore.
// Usato in CreatePartyScreen e JoinScreen.

import { motion } from 'framer-motion'
import MiniBlob, { useMiniExpr } from './MiniBlob'
import { AVATAR_COLORS } from '../utils/colors'

const ColorPicker = ({
  selected,
  onSelect,
  takenColors = [],
  label = '🎨 Scegli il tuo colore',
}) => {
  const expr = useMiniExpr()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      style={cardStyle}
    >
      <div style={labelStyle}>{label}</div>
      <div style={gridStyle}>
        {AVATAR_COLORS.map((c, i) => {
          const taken = takenColors.includes(c)
          const active = selected === c
          return (
            <motion.button
              key={c}
              type="button"
              whileHover={!taken ? { scale: 1.12 } : {}}
              whileTap={!taken ? { scale: 0.88 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => !taken && onSelect(c)}
              disabled={taken}
              style={{
                ...blobBtnStyle,
                border: active
                  ? `3px solid var(--text)`
                  : '3px solid transparent',
                boxShadow: active
                  ? `0 0 0 3px ${c}40, 0 4px 12px ${c}35`
                  : '0 2px 6px rgba(0,0,0,0.06)',
                background: active
                  ? `${c}12`
                  : 'var(--bg)',
                opacity: taken ? 0.25 : 1,
                cursor: taken ? 'not-allowed' : 'pointer',
              }}
            >
              <MiniBlob
                color={c}
                expr={active ? 'happy' : expr}
                size={44}
                id={`cp-${i}`}
              />
              {taken && (
                <span style={takenOverlay}>✕</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

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
  gap: 'clamp(6px, 1.2vw, 12px)',
  justifyItems: 'center',
}

const blobBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'clamp(48px, 11vw, 64px)',
  height: 'clamp(48px, 11vw, 64px)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  position: 'relative',
  padding: 0,
}

const takenOverlay = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 800,
  fontSize: 18,
  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  borderRadius: 'inherit',
  background: 'rgba(0,0,0,0.15)',
}

export default ColorPicker
