import { motion } from 'framer-motion'
import { haptic } from '../../utils/haptic'

const SHADOWS = {
  primary: {
    rest: '0 4px 14px rgba(0,0,0,0.18)',
    hover: '0 10px 30px rgba(0,0,0,0.3)',
    tap: '0 2px 6px rgba(0,0,0,0.15)',
  },
  secondary: {
    rest: '0 2px 8px rgba(0,0,0,0.06)',
    hover: '0 6px 20px rgba(0,0,0,0.10)',
    tap: '0 1px 3px rgba(0,0,0,0.04)',
  },
  danger: {
    rest: '0 4px 14px rgba(239,68,68,0.25)',
    hover: '0 10px 30px rgba(239,68,68,0.35)',
    tap: '0 2px 6px rgba(239,68,68,0.15)',
  },
}

const spring = { type: 'spring', stiffness: 400, damping: 22 }

const Button = ({
  variant = 'primary',
  width,
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  style: styleProp,
  ...rest
}) => {
  const widthClass = width === 'full' ? 'w-full' : ''
  const isSecondary = variant === 'secondary'
  const s = SHADOWS[variant] || SHADOWS.primary
  const hasCustomShadow = !!styleProp?.boxShadow

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : (e) => { haptic.tick(); onClick?.(e) }}
      whileHover={disabled ? undefined : {
        y: -2,
        ...(!hasCustomShadow && { boxShadow: s.hover }),
      }}
      whileTap={disabled ? undefined : {
        y: 1,
        scale: 0.97,
        ...(!hasCustomShadow && { boxShadow: s.tap }),
      }}
      transition={spring}
      className={[
        'inline-flex items-center justify-center font-semibold select-none rounded-sm',
        widthClass,
        disabled ? 'pointer-events-none' : '',
        className,
      ].join(' ')}
      style={{
        height: 'clamp(48px, 7dvh, 64px)',
        padding: '0 clamp(16px, 4vw, 24px)',
        fontSize: 'clamp(14px, 2dvh, 18px)',
        gap: '8px',
        borderRadius: 'var(--radius-sm)',
        background: variant === 'primary'
          ? 'var(--accent)'
          : isSecondary
            ? 'var(--surface)'
            : undefined,
        color: isSecondary ? 'var(--text)' : 'var(--bg)',
        border: isSecondary ? '1.5px solid var(--border-strong)' : 'none',
        boxShadow: s.rest,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s ease, background 0.15s ease, border-color 0.15s ease',
        ...styleProp,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button
