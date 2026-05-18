// Card cliccabile usata per scelte (mode, categoria). Layout orizzontale:
// emoji + (title + descrizione) + badge opzionale + freccia.
//
// `option`: { emoji, label/title, description, bg, shadow }
// `badge`: nodo a destra (es. "3 voti")
// `selected`: ring accent attorno

import { motion } from 'framer-motion'
import { haptic } from '../../utils/haptic'

const OptionCard = ({
  option,
  index = 0,
  onClick,
  disabled = false,
  badge = null,
  selected = false,
  // Layout "tall": padding più generoso + descrizione su 2 righe (no ellipsis).
  // Usato dalle categorie strutturali (GameCategoryScreen). Default false: card
  // compatte single-line come ModeScreen / HomeScreen.
  tall = false,
}) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
    whileHover={!disabled ? {
      scale: 1.02,
      y: -4,
      boxShadow: `0 24px 56px ${option.shadow}, 0 8px 18px rgba(0, 0, 0, 0.22)`,
    } : {}}
    whileTap={!disabled ? {
      scale: 0.97,
      y: 0,
      boxShadow: `0 4px 12px ${option.shadow}, 0 2px 6px rgba(0, 0, 0, 0.22)`,
    } : {}}
    onClick={disabled ? undefined : () => { haptic.light(); onClick?.() }}
    disabled={disabled}
    style={{
      width: '100%',
      background: option.bg,
      borderRadius: 22,
      // Border + dark drop shadow combinati per dare un bordo netto al box
      // sopra l'eventuale alone colorato dietro.
      border: selected
        ? '2.5px solid var(--accent)'
        : (option.border || (option.textColor ? '1.5px solid var(--border-strong)' : '2px solid rgba(0, 0, 0, 0.28)')),
      boxShadow: `0 14px 36px ${option.shadow}, 0 6px 14px rgba(0, 0, 0, 0.22)`,
      padding: tall
        ? 'clamp(22px, 3.2dvh, 30px) clamp(18px, 4vw, 24px)'
        : 'clamp(18px, 2.5dvh, 24px) clamp(18px, 4vw, 24px)',
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(14px, 2.5vw, 18px)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      textAlign: 'left',
      position: 'relative',
      overflow: 'hidden',
      outline: 'none',
      boxSizing: 'border-box',
      WebkitBackfaceVisibility: 'hidden',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {!option.textColor && <div style={{
      position: 'absolute', top: -28, right: -28, width: 110, height: 110,
      borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
      filter: 'blur(20px)', pointerEvents: 'none',
    }} />}

    <div style={{
      fontSize: 'clamp(36px, 5dvh, 48px)',
      lineHeight: 1,
      flexShrink: 0,
    }}>{option.emoji}</div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 'clamp(16px, 2.2dvh, 20px)',
        fontWeight: option.subtleTitle ? 700 : 800,
        color: option.textColor || '#fff',
        letterSpacing: '-0.01em',
        marginBottom: 3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{option.title ?? option.label}</div>
      <div style={{
        fontSize: 'clamp(12px, 1.6dvh, 14px)',
        color: option.textColor ? 'var(--muted)' : 'rgba(255,255,255,0.85)',
        lineHeight: 1.35,
        ...(tall
          ? {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              minHeight: 'calc(1.35em * 2)',
            }
          : {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }
        ),
      }}>{option.description}</div>
    </div>

    {badge && (
      <div style={{
        background: 'rgba(255,255,255,0.28)',
        borderRadius: 14,
        padding: '5px 11px',
        color: '#fff',
        fontSize: 'clamp(11px, 1.4dvh, 13px)',
        fontWeight: 800,
        flexShrink: 0,
        backdropFilter: 'blur(4px)',
      }}>
        {badge}
      </div>
    )}

    <div style={{
      fontSize: 22,
      color: option.textColor || '#fff',
      opacity: 0.55,
      flexShrink: 0,
      fontWeight: 700,
    }}>→</div>
  </motion.button>
)

export default OptionCard
