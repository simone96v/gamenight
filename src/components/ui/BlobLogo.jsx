// Logo "Blob Party" — blob SVG + testo gradient.
// Riusabile come logo principale e nei headers.

const BlobLogo = ({ size = 'md', clickable = false, onClick }) => {
  const sizes = {
    sm: { blob: 26, text: 'clamp(15px, 2dvh, 17px)' },
    md: { blob: 32, text: 'clamp(18px, 2.5dvh, 22px)' },
    lg: { blob: 48, text: 'clamp(24px, 3.5dvh, 32px)' },
    xl: { blob: 72, text: 'clamp(32px, 5dvh, 44px)' },
  }
  const s = sizes[size] ?? sizes.md

  const Wrapper = clickable ? 'button' : 'div'

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      aria-label="Blob Party"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <svg
        width={s.blob}
        height={s.blob}
        viewBox="0 0 100 100"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="blob-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <radialGradient id="blob-hl" cx="32%" cy="28%" r="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {/* Blob shape organica */}
        <path
          d="M50 6 C72 6, 94 22, 94 48 C94 72, 78 92, 54 94 C30 96, 8 78, 6 54 C4 30, 22 8, 50 6 Z"
          fill="url(#blob-grad-1)"
        />
        {/* Glossy highlight */}
        <ellipse cx="35" cy="30" rx="18" ry="14" fill="url(#blob-hl)" />
        {/* Eyes */}
        <circle cx="38" cy="46" r="3.5" fill="#fff" />
        <circle cx="62" cy="46" r="3.5" fill="#fff" />
      </svg>
      <span
        style={{
          fontSize: s.text,
          fontWeight: 900,
          letterSpacing: '-0.025em',
          background: 'linear-gradient(120deg, #7C3AED 30%, #EC4899 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}
      >
        Blob Party
      </span>
    </Wrapper>
  )
}

export default BlobLogo
