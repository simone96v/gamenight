import { motion } from 'framer-motion'
import { BLOB_GRADIENTS, GRAY_GRADIENT } from '../utils/colors'

const OUTLINE = '#1F2937'

const BlobEyes = ({
  expr,
  lx = 100, rx = 200, ey = 115, my = 160,
  eyeRx = 34, eyeRy = 40, pupilR = 9, glintR = 3.5,
  strokeW = 7, smileW = 28, smileBend = 14,
  rotate = 0,
  gaze = null, // { x: -1..1, y: -1..1 } per parallasse pupille
}) => {
  // Parallasse: la pupilla bianca shifta dentro l'occhio in base a gaze.
  // Si somma agli offset dell'expression (look-left/right). Modesto: max ±8/±5.
  const gazeDx = gaze ? gaze.x * 8 : 0
  const gazeDy = gaze ? gaze.y * 5 : 0
  const lookDx = (expr === 'look-left' ? -11 : expr === 'look-right' ? 11 : 0) + gazeDx
  const lookDy = (expr === 'look-left' || expr === 'look-right' ? -5 : 0) + gazeDy
  const cx = (lx + rx) / 2
  const wrap = (children) =>
    rotate ? <g transform={`rotate(${rotate}, ${cx}, ${ey})`}>{children}</g> : <>{children}</>

  if (expr === 'blink') {
    const blinkW = eyeRx * 0.88
    return wrap(
      <>
        <path d={`M${lx - blinkW} ${ey} Q${lx} ${ey + 11}, ${lx + blinkW} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW} strokeLinecap="round" />
        <path d={`M${rx - blinkW} ${ey} Q${rx} ${ey + 11}, ${rx + blinkW} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW} strokeLinecap="round" />
        <path d={`M${cx - smileW} ${my} Q${cx} ${my + smileBend}, ${cx + smileW} ${my}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW} strokeLinecap="round" />
      </>
    )
  }

  if (expr === 'happy') {
    const happyW = eyeRx * 0.88
    return wrap(
      <>
        <path d={`M${lx - happyW} ${ey + 10} Q${lx} ${ey - 26}, ${lx + happyW} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW + 1} strokeLinecap="round" />
        <path d={`M${rx - happyW} ${ey + 10} Q${rx} ${ey - 26}, ${rx + happyW} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW + 1} strokeLinecap="round" />
        <path d={`M${cx - smileW - 4} ${my - 4} Q${cx} ${my + 26}, ${cx + smileW + 4} ${my - 4}`}
          fill="none" stroke={OUTLINE} strokeWidth={strokeW + 1} strokeLinecap="round" />
      </>
    )
  }

  return wrap(
    <>
      {/* Left eye: solid dark + highlight */}
      <ellipse cx={lx} cy={ey} rx={eyeRx} ry={eyeRy} fill={OUTLINE} />
      <circle cx={lx + 11 + lookDx} cy={ey - 13 + lookDy} r={pupilR} fill="#fff" />
      <circle cx={lx - 9 + lookDx} cy={ey + 15 + lookDy} r={glintR} fill="rgba(255,255,255,0.6)" />
      {/* Right eye */}
      <ellipse cx={rx} cy={ey} rx={eyeRx} ry={eyeRy} fill={OUTLINE} />
      <circle cx={rx + 11 + lookDx} cy={ey - 13 + lookDy} r={pupilR} fill="#fff" />
      <circle cx={rx - 9 + lookDx} cy={ey + 15 + lookDy} r={glintR} fill="rgba(255,255,255,0.6)" />
      {/* Smile */}
      <path d={`M${cx - smileW} ${my} Q${cx} ${my + smileBend}, ${cx + smileW} ${my}`}
        fill="none" stroke={OUTLINE} strokeWidth={strokeW} strokeLinecap="round" />
    </>
  )
}

export { BlobEyes }

const Blob = ({
  color,
  expr = 'normal',
  rotate = 0,
  size = 'clamp(200px, 45vw, 320px)',
  style,
  id = 'blob',
  animate = true,
  name,
  face,
  gaze = null,
}) => {
  const [c1, c2, c3] = BLOB_GRADIENTS[color] || GRAY_GRADIENT
  const prefix = id

  const Container = animate ? motion.div : 'div'
  const animProps = animate
    ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 180, damping: 18 } }
    : {}

  return (
    <Container
      {...animProps}
      style={{
        position: 'fixed',
        zIndex: 1,
        pointerEvents: 'none',
        lineHeight: 0,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 300 300"
        style={{
          width: size,
          height: 'auto',
          overflow: 'visible',
          // Bagliore esterno luminoso: drop-shadow col colore più chiaro
          // dello stesso gradient (segue il contorno del blob, non il box).
          filter: `drop-shadow(0 0 16px ${c1}80) drop-shadow(0 4px 12px ${c3}55)`,
        }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${prefix}-grad`} cx="40%" cy="36%" r="72%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="60%" stopColor={c2} />
            <stop offset="100%" stopColor={c3} />
          </radialGradient>
        </defs>
        {/* Body: forma BLOB canonica (matches MiniBlob pose='idle') */}
        <path
          d="M150,24 C220,24 282,80 282,148 C282,232 224,284 150,284 C76,284 18,232 18,148 C18,80 80,24 150,24 Z"
          fill={`url(#${prefix}-grad)`}
        />
        <ellipse cx="100" cy="90" rx="24" ry="15" fill={c1} opacity="0.85" transform="rotate(-30 100 90)" />
        <BlobEyes expr={expr} rotate={rotate} gaze={gaze} {...face} />
      </svg>
      {name && (
        <div style={{
          position: 'absolute',
          bottom: '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 'clamp(11px, 1.4dvh, 14px)',
          textShadow: '0 2px 6px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {name}
        </div>
      )}
    </Container>
  )
}

export default Blob
