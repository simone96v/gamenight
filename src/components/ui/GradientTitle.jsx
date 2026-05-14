// Titolo con gradient violet→pink. Usato come heading principale in tutta l'app.
// `size`: sm | md | lg | xl

const SIZES = {
  sm: 'clamp(16px, 2.2dvh, 20px)',
  md: 'clamp(22px, 3.2dvh, 30px)',
  lg: 'clamp(26px, 4vw, 38px)',
  xl: 'clamp(36px, 7vw, 56px)',
}

const GradientTitle = ({ as = 'h1', size = 'md', gradient, children, style, ...rest }) => {
  const Tag = as
  const gradientStyle = gradient ? {
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } : { color: 'var(--text)' }

  return (
    <Tag
      style={{
        margin: 0,
        fontSize: SIZES[size] ?? SIZES.md,
        fontFamily: "'Baloo 2', cursive",
        fontWeight: 700,
        letterSpacing: '-0.01em',
        lineHeight: 1.15,
        ...gradientStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default GradientTitle
