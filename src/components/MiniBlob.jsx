// Shared MiniBlob: piccolo blob SVG con gradiente + occhi animati.
// Riutilizzato in LobbyScreen, FinalPhase, ecc.

import { useState, useEffect, useRef } from 'react'
import { BLOB_GRADIENTS } from '../utils/colors'

const MINI_EXPR_SEQ = [
  { expr: 'normal',     dur: 2500 },
  { expr: 'look-right', dur: 2000 },
  { expr: 'blink',      dur: 150 },
  { expr: 'look-right', dur: 3000 },
  { expr: 'normal',     dur: 2000 },
  { expr: 'look-left',  dur: 2500 },
  { expr: 'blink',      dur: 150 },
  { expr: 'look-left',  dur: 2000 },
  { expr: 'happy',      dur: 2000 },
  { expr: 'blink',      dur: 150 },
  { expr: 'normal',     dur: 3000 },
]

export const useMiniExpr = () => {
  const [expr, setExpr] = useState('normal')
  const idxRef = useRef(0)
  useEffect(() => {
    let timer
    const step = () => {
      const s = MINI_EXPR_SEQ[idxRef.current]
      setExpr(s.expr)
      idxRef.current = (idxRef.current + 1) % MINI_EXPR_SEQ.length
      timer = setTimeout(step, s.dur)
    }
    step()
    return () => clearTimeout(timer)
  }, [])
  return expr
}

const MiniBlobEyes = ({ expr, lx, rx, ey, id }) => {
  const dx = expr === 'look-left' ? -9 : expr === 'look-right' ? 9 : 0
  const dy = expr === 'look-left' ? -3 : expr === 'look-right' ? -3 : 0

  if (expr === 'blink') {
    return (
      <>
        <ellipse cx={lx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
        <ellipse cx={rx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
      </>
    )
  }
  if (expr === 'happy') {
    return (
      <>
        <path d={`M${lx - 22} ${ey + 3} Q${lx} ${ey - 22}, ${lx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${rx - 22} ${ey + 3} Q${rx} ${ey - 22}, ${rx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </>
    )
  }
  return (
    <>
      <ellipse cx={lx} cy={ey} rx="26" ry="28" fill={`url(#${id}-el)`} />
      <circle cx={lx + 3 + dx} cy={ey + 4 + dy} r="12" fill="#6D28D9" />
      <circle cx={lx + 5 + dx} cy={ey + 1 + dy} r="4.5" fill="#1E1B4B" />
      <circle cx={lx + 9 + dx} cy={ey - 3 + dy} r="2.8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx={rx} cy={ey} rx="26" ry="28" fill={`url(#${id}-el)`} />
      <circle cx={rx + 3 + dx} cy={ey + 4 + dy} r="12" fill="#6D28D9" />
      <circle cx={rx + 5 + dx} cy={ey + 1 + dy} r="4.5" fill="#1E1B4B" />
      <circle cx={rx + 9 + dx} cy={ey - 3 + dy} r="2.8" fill="rgba(255,255,255,0.9)" />
    </>
  )
}

const MiniBlob = ({ color, expr = 'normal', size = 42, id = 'mb' }) => {
  const [c1, c2, c3] = BLOB_GRADIENTS[color] || ['#E5E7EB', '#D1D5DB', '#9CA3AF']
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="40%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
        <radialGradient id={`${id}-el`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#F0ECF9" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="145" fill={`url(#${id}-g)`} />
      <MiniBlobEyes expr={expr} lx={115} rx={185} ey={140} id={id} />
    </svg>
  )
}

export default MiniBlob
