import { motion } from 'framer-motion'
import { BLOB_GRADIENTS, GRAY_GRADIENT } from '../utils/colors'

const BlobEyes = ({ expr, lx, rx, ey, prefix, rotate = 0 }) => {
  const pupilDx = expr === 'look-left' ? -9 : expr === 'look-right' ? 9 : 0
  const pupilDy = expr === 'look-left' ? -3 : expr === 'look-right' ? -3 : 0
  const cx = (lx + rx) / 2
  const wrap = (children) =>
    rotate ? <g transform={`rotate(${rotate}, ${cx}, ${ey})`}>{children}</g> : <>{children}</>

  if (expr === 'blink') {
    return wrap(
      <>
        <ellipse cx={lx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
        <ellipse cx={rx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
      </>
    )
  }

  if (expr === 'happy') {
    return wrap(
      <>
        <path d={`M${lx - 22} ${ey + 3} Q${lx} ${ey - 22}, ${lx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${rx - 22} ${ey + 3} Q${rx} ${ey - 22}, ${rx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </>
    )
  }

  return wrap(
    <>
      <ellipse cx={lx} cy={ey} rx="26" ry="28" fill={`url(#${prefix}-eye-l)`} />
      <circle cx={lx + 3 + pupilDx} cy={ey + 4 + pupilDy} r="12" fill="#6D28D9" />
      <circle cx={lx + 5 + pupilDx} cy={ey + 1 + pupilDy} r="4.5" fill="#1E1B4B" />
      <circle cx={lx + 9 + pupilDx} cy={ey - 3 + pupilDy} r="2.8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx={rx} cy={ey} rx="26" ry="28" fill={`url(#${prefix}-eye-r)`} />
      <circle cx={rx + 3 + pupilDx} cy={ey + 4 + pupilDy} r="12" fill="#6D28D9" />
      <circle cx={rx + 5 + pupilDx} cy={ey + 1 + pupilDy} r="4.5" fill="#1E1B4B" />
      <circle cx={rx + 9 + pupilDx} cy={ey - 3 + pupilDy} r="2.8" fill="rgba(255,255,255,0.9)" />
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
        style={{ width: size, height: 'auto', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${prefix}-grad`} x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="40%" stopColor={c2} />
            <stop offset="100%" stopColor={c3} />
          </linearGradient>
          <radialGradient id={`${prefix}-eye-l`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#F0ECF9" />
          </radialGradient>
          <radialGradient id={`${prefix}-eye-r`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#F0ECF9" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="145" fill={`url(#${prefix}-grad)`} />
        <BlobEyes expr={expr} lx={115} rx={185} ey={140} prefix={prefix} rotate={rotate} />
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
