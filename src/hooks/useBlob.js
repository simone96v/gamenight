// Hook condivisi per stati animati del blob (espressione + walk frame).

import { useState, useEffect, useRef } from 'react'
import { AVATAR_COLORS } from '../utils/colors'

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

// Ciclo walk: 0 → 1 → 2 → 1 → 0 → ...
export const useWalkFrame = (enabled = true, ms = 220) => {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let dir = 1
    const id = setInterval(() => {
      setFrame((f) => {
        if (f >= 2) dir = -1
        if (f <= 0) dir = 1
        return f + dir
      })
    }, ms)
    return () => clearInterval(id)
  }, [enabled, ms])
  return frame
}

// useColorCycle — cicla tra i colori della palette avatar con intervallo `ms`.
// startIdx permette di sfasare cicli paralleli (es. due blob che cambiano in
// modo indipendente). Il colore restituito viene passato come prop `color` al
// blob: il componente Blob.jsx anima la transizione del gradient con un fade
// lento (vedi TRANSITION costante in Blob.jsx).
export const useColorCycle = ({ ms = 5000, startIdx = 0 } = {}) => {
  const [idx, setIdx] = useState(startIdx % AVATAR_COLORS.length)
  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % AVATAR_COLORS.length)
    }, ms)
    return () => clearInterval(id)
  }, [ms])
  return AVATAR_COLORS[idx]
}

// useBlobGaze — parallasse sguardo. Restituisce offset normalizzato (-1..1)
// per asse x/y in base alla posizione del mouse rispetto al centro viewport.
// `strength` modula l'intensità (default 1). Su mobile (no mousemove) resta a 0,0.
export const useBlobGaze = ({ strength = 1 } = {}) => {
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = null
    const handler = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / cx))
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / cy))
        setGaze({ x: dx * strength, y: dy * strength })
        raf = null
      })
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handler)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])
  return gaze
}
