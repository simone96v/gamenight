import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Spinner from './ui/Spinner'

const EXPR_SEQUENCE = [
  { top: 'look-right', bottom: 'look-left',  dur: 2000 },
  { top: 'blink',      bottom: 'look-left',  dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 2500 },
  { top: 'look-right', bottom: 'blink',      dur: 150 },
  { top: 'happy',      bottom: 'look-left',  dur: 2000 },
  { top: 'look-right', bottom: 'happy',      dur: 2000 },
  { top: 'blink',      bottom: 'blink',      dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 2500 },
]

const useExpressions = () => {
  const [topExpr, setTopExpr] = useState('look-right')
  const [bottomExpr, setBottomExpr] = useState('look-left')
  const idxRef = useRef(0)

  useEffect(() => {
    let timer
    const step = () => {
      const s = EXPR_SEQUENCE[idxRef.current]
      setTopExpr(s.top)
      setBottomExpr(s.bottom)
      idxRef.current = (idxRef.current + 1) % EXPR_SEQUENCE.length
      timer = setTimeout(step, s.dur)
    }
    step()
    return () => clearTimeout(timer)
  }, [])

  return { topExpr, bottomExpr }
}

const OUTLINE = '#1F2937'

const BlobEyes = ({ expr, lx = 100, rx = 200, ey = 115, my = 160, rotate = 0 }) => {
  const lookDx = expr === 'look-left' ? -11 : expr === 'look-right' ? 11 : 0
  const lookDy = expr === 'look-left' || expr === 'look-right' ? -5 : 0
  const cx = (lx + rx) / 2
  const wrap = (children) =>
    rotate ? <g transform={`rotate(${rotate}, ${cx}, ${ey})`}>{children}</g> : <>{children}</>

  if (expr === 'blink') {
    return wrap(
      <>
        <path d={`M${lx - 30} ${ey} Q${lx} ${ey + 11}, ${lx + 30} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
        <path d={`M${rx - 30} ${ey} Q${rx} ${ey + 11}, ${rx + 30} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
        <path d={`M${cx - 28} ${my} Q${cx} ${my + 14}, ${cx + 28} ${my}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
      </>
    )
  }

  if (expr === 'happy') {
    return wrap(
      <>
        <path d={`M${lx - 30} ${ey + 10} Q${lx} ${ey - 26}, ${lx + 30} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${rx - 30} ${ey + 10} Q${rx} ${ey - 26}, ${rx + 30} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${cx - 32} ${my - 4} Q${cx} ${my + 28}, ${cx + 32} ${my - 4}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
      </>
    )
  }

  return wrap(
    <>
      <ellipse cx={lx} cy={ey} rx="34" ry="40" fill={OUTLINE} />
      <circle cx={lx + 11 + lookDx} cy={ey - 13 + lookDy} r="9" fill="#fff" />
      <circle cx={lx - 9 + lookDx} cy={ey + 15 + lookDy} r="3.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx={rx} cy={ey} rx="34" ry="40" fill={OUTLINE} />
      <circle cx={rx + 11 + lookDx} cy={ey - 13 + lookDy} r="9" fill="#fff" />
      <circle cx={rx - 9 + lookDx} cy={ey + 15 + lookDy} r="3.5" fill="rgba(255,255,255,0.6)" />
      <path d={`M${cx - 28} ${my} Q${cx} ${my + 14}, ${cx + 28} ${my}`}
        fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
    </>
  )
}

const BLOB_COLORS = {
  tb: ['#C4B5FD', '#A78BFA', '#8B5CF6'],
  tr: ['#FDE68A', '#FBBF24', '#F59E0B'],
  bl: ['#6EE7B7', '#34D399', '#10B981'],
  bb: ['#FDA4AF', '#FB7185', '#F43F5E'],
}

const blobDefs = (prefix) => {
  const [c1, c2, c3] = BLOB_COLORS[prefix]
  return (
    <defs>
      <radialGradient id={`bl-${prefix}-grad`} cx="40%" cy="36%" r="72%">
        <stop offset="0%" stopColor={c1} />
        <stop offset="60%" stopColor={c2} />
        <stop offset="100%" stopColor={c3} />
      </radialGradient>
    </defs>
  )
}

// Body path per pose — sottoinsieme allineato a src/components/MiniBlob.jsx
const POSE_PATHS = {
  idle:   'M150,24 C220,24 282,80 282,148 C282,232 224,284 150,284 C76,284 18,232 18,148 C18,80 80,24 150,24 Z',
  bounce: 'M150,2 C214,2 268,52 268,140 C268,232 218,295 150,295 C82,295 32,232 32,140 C32,52 86,2 150,2 Z',
  squish: 'M150,40 C228,40 288,90 288,165 C288,235 230,278 150,278 C70,278 12,235 12,165 C12,90 72,40 150,40 Z',
  ooze:   'M150,30 C218,30 270,80 270,150 C270,200 260,230 240,250 C212,278 180,280 150,278 C120,280 88,278 60,250 C40,230 30,200 30,150 C30,80 82,30 150,30 Z',
}

const MiniBlob = ({ prefix, expr, rotate, pose = 'idle', style, delay }) => {
  const c1 = BLOB_COLORS[prefix][0]
  const path = POSE_PATHS[pose] || POSE_PATHS.idle
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      style={{ position: 'absolute', pointerEvents: 'none', lineHeight: 0, ...style }}
    >
      <svg viewBox="0 0 300 300" style={{ width: '100%', height: 'auto' }} aria-hidden="true">
        {blobDefs(prefix)}
        <path d={path} fill={`url(#bl-${prefix}-grad)`} />
        <ellipse cx="100" cy="90" rx="22" ry="14" fill={c1} opacity="0.85" transform="rotate(-30 100 90)" />
        <BlobEyes expr={expr} rotate={rotate} />
      </svg>
    </motion.div>
  )
}

const BlobLoader = ({ text = 'Caricamento...', visible = true }) => {
  const { topExpr, bottomExpr } = useExpressions()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={S.container}
        >
          <MiniBlob prefix="tb" expr={topExpr} rotate={-45} pose="bounce" delay={0}
            style={{ top: '-8%', left: '-10%', width: 'clamp(100px, 28vw, 160px)' }} />
          <MiniBlob prefix="tr" expr={bottomExpr} rotate={45} pose="squish" delay={0.05}
            style={{ top: '-8%', right: '-10%', width: 'clamp(110px, 30vw, 170px)' }} />
          <MiniBlob prefix="bl" expr={topExpr} rotate={45} pose="ooze" delay={0.1}
            style={{ bottom: '-8%', left: '-10%', width: 'clamp(110px, 30vw, 170px)' }} />
          <MiniBlob prefix="bb" expr={bottomExpr} rotate={-45} pose="idle" delay={0.15}
            style={{ bottom: '-8%', right: '-10%', width: 'clamp(100px, 28vw, 160px)' }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 22 }}
            style={S.center}
          >
            <Spinner size="lg" />
            <p style={S.text}>{text}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const S = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    overflow: 'hidden',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  text: {
    margin: 0,
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontWeight: 700,
    color: 'var(--muted)',
  },
}

export default BlobLoader
