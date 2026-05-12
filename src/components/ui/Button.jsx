// Bottone primario riusabile.
// Varianti:
//   primary   → gradiente accent → accent2, testo bianco
//   secondary → bg trasparente, border 1.5px --border, testo --muted
//   danger    → bg --danger, testo bianco
// `width="full"` → larghezza 100%.
// `disabled`    → opacity 0.4 + pointer-events none.
// Animazione: whileTap scale 0.96, transizione spring stiffness 400.

import { motion } from 'framer-motion'

const VARIANT_CLASS = {
  primary:   'bg-gradient-to-r from-accent to-accent2 text-white',
  secondary: 'bg-transparent text-muted',
  danger:    'bg-danger text-white',
}

const Button = ({
  variant = 'primary',
  width,
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  ...rest
}) => {
  const widthClass = width === 'full' ? 'w-full' : ''
  const disabledClass = disabled ? 'opacity-40 pointer-events-none' : ''
  const isSecondary = variant === 'secondary'

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400 }}
      className={[
        'inline-flex items-center justify-center font-semibold select-none rounded-sm',
        VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary,
        widthClass,
        disabledClass,
        className,
      ].join(' ')}
      style={{
        height: 'clamp(48px, 7dvh, 64px)',
        padding: '0 clamp(16px, 4vw, 24px)',
        fontSize: 'clamp(14px, 2dvh, 18px)',
        gap: '8px',
        border: isSecondary ? '1.5px solid var(--border)' : 'none',
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button
