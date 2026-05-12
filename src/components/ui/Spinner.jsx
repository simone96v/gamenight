// Spinner di caricamento. Cerchio con bordo --accent in rotazione (animate-spin di Tailwind).
// `size`: 'sm' (16) | 'md' (24, default) | 'lg' (40).

const SIZES = { sm: 16, md: 24, lg: 40 }

const Spinner = ({ size = 'md', className = '' }) => {
  const px = SIZES[size] ?? SIZES.md
  return (
    <div
      role="status"
      aria-label="Caricamento"
      className={`rounded-full animate-spin ${className}`}
      style={{
        width: px,
        height: px,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
      }}
    />
  )
}

export default Spinner
