// Superficie generica per contenuti: bg --surface, border --border, radius --radius (16px).
// Se viene passato `onClick`, diventa cliccabile (renderizzata come <button>) con micro-feedback al tap.

const Card = ({
  children,
  onClick,
  className = '',
  padding = true,
  selected = false,
  ...rest
}) => {
  const Tag = onClick ? 'button' : 'div'
  const clickable = onClick
    ? 'cursor-pointer transition-transform active:scale-[0.98] text-left w-full'
    : ''
  return (
    <Tag
      onClick={onClick}
      className={[
        'bg-surface rounded',
        clickable,
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
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Card
