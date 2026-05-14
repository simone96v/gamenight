import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 400, damping: 22 }

const Card = ({
  children,
  onClick,
  className = '',
  padding = true,
  selected = false,
  ...rest
}) => {
  const isClickable = !!onClick
  const Tag = isClickable ? motion.button : 'div'

  const motionProps = isClickable ? {
    whileHover: { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' },
    whileTap: { y: 0, scale: 0.98, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    transition: spring,
  } : {}

  return (
    <Tag
      onClick={onClick}
      className={[
        'bg-surface rounded',
        isClickable ? 'cursor-pointer text-left w-full' : '',
        className,
      ].join(' ')}
      style={{
        border: selected
          ? '1.5px solid var(--accent)'
          : '1px solid var(--border)',
        color: 'var(--text)',
        padding: padding
          ? 'clamp(14px, 2.5dvh, 22px) clamp(14px, 3vw, 22px)'
          : 0,
        boxShadow: isClickable ? '0 2px 8px rgba(0,0,0,0.06)' : undefined,
        transition: 'border-color 0.15s ease',
      }}
      {...motionProps}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Card
