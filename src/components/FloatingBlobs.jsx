// FloatingBlobs — riempie lo spazio laterale sui display desktop con blob
// colorati che fluttuano e rimbalzano contro i bordi e tra loro.
// Su mobile (banda laterale < BAND_MIN px) non renderizza nulla.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Blob from './Blob'
import { AVATAR_COLORS } from '../utils/colors'

const CENTER_HALF    = 260   // half-width della .screen-narrow (max-width 520)
const BAND_MIN       = 100   // banda minima per attivare
const COUNT_PER_SIDE = 4

// Fisica
const SUB_STEPS     = 4       // più sub-step → meno "snap" sulle collisioni
const RESTITUTION   = 0.94    // 1=perfettamente elastica, <1=leggero ammortizzamento
const VEL_DAMPING   = 0.9998  // damping minimo: i blob non devono mai fermarsi
const IDLE_SPEED    = 0.15    // sotto questa velocità diamo un piccolo kick random
const IDLE_KICK     = 0.05    // ampiezza del kick di mantenimento

// Interattività click
const SHOCK_RADIUS = 380
const SHOCK_POWER  = 9
const REACTION_MS  = 700
const REACTIONS    = ['happy', 'blink', 'look-left', 'look-right']
const pickReaction = () => REACTIONS[Math.floor(Math.random() * REACTIONS.length)]

function initBlobs() {
  if (typeof window === 'undefined') return []
  const w = window.innerWidth
  const h = window.innerHeight
  const cx = w / 2
  const leftEnd = cx - CENTER_HALF
  const rightStart = cx + CENTER_HALF
  if (leftEnd < BAND_MIN || w - rightStart < BAND_MIN) return []

  const out = []
  for (let side = 0; side < 2; side++) {
    const bandStart = side === 0 ? 0 : rightStart
    const bandEnd = side === 0 ? leftEnd : w
    const bandW = bandEnd - bandStart
    const rMax = Math.min(95, Math.max(48, bandW * 0.32))
    const rMin = Math.max(42, rMax * 0.55)
    for (let i = 0; i < COUNT_PER_SIDE; i++) {
      const r = rMin + Math.random() * (rMax - rMin)
      out.push({
        id: `fb-${side}-${i}`,
        color: AVATAR_COLORS[(side * COUNT_PER_SIDE + i) % AVATAR_COLORS.length],
        side,
        x: bandStart + r + Math.random() * Math.max(0, bandW - 2 * r),
        y: r + Math.random() * Math.max(0, h - 2 * r),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r,
        // Massa proporzionale all'area (r²) → blob grandi spostano meno i piccoli
        m: r * r,
      })
    }
  }
  return out
}

const FloatingBlobs = () => {
  const [blobs, setBlobs] = useState(() => initBlobs())
  const [exprMap, setExprMap] = useState({})
  const [waves, setWaves] = useState([])
  const stateRef = useRef(blobs)
  const refsRef = useRef({})

  useEffect(() => { stateRef.current = blobs }, [blobs])

  const removeWave = (wid) => setWaves((w) => w.filter((wv) => wv.id !== wid))

  const onClickBlob = (id) => {
    const reaction = pickReaction()
    setExprMap((prev) => ({ ...prev, [id]: reaction }))
    setTimeout(() => {
      setExprMap((prev) => {
        if (prev[id] !== reaction) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, REACTION_MS)

    const arr = stateRef.current
    const src = arr.find((b) => b.id === id)
    if (!src) return

    // Onda d'urto visiva (componente animato sotto)
    setWaves((w) => [...w, {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: src.x, y: src.y, color: src.color,
    }])

    // Onda d'urto fisica
    for (const other of arr) {
      if (other === src || other.side !== src.side) continue
      const dx = other.x - src.x, dy = other.y - src.y
      const dist = Math.hypot(dx, dy) || 0.001
      if (dist > SHOCK_RADIUS) continue
      const falloff = 1 - dist / SHOCK_RADIUS
      const nx = dx / dist, ny = dy / dist
      const accel = (SHOCK_POWER * falloff) / Math.sqrt(other.m / 2200)
      other.vx += nx * accel
      other.vy += ny * accel
    }
  }

  useEffect(() => {
    const onResize = () => {
      const fresh = initBlobs()
      stateRef.current = fresh
      setBlobs(fresh)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (blobs.length === 0) return
    let raf
    const tick = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w / 2
      const leftEnd = cx - CENTER_HALF
      const rightStart = cx + CENTER_HALF
      const arr = stateRef.current

      // Sub-stepping: integro più volte per frame → collisioni più morbide
      const dt = 1 / SUB_STEPS
      for (let s = 0; s < SUB_STEPS; s++) {
        for (const b of arr) {
          b.x += b.vx * dt
          b.y += b.vy * dt
          b.vx *= VEL_DAMPING
          b.vy *= VEL_DAMPING

          // Mantiene il fluttuare in loop: se troppo lento, piccolo kick random
          const sp = Math.hypot(b.vx, b.vy)
          if (sp < IDLE_SPEED) {
            b.vx += (Math.random() - 0.5) * IDLE_KICK
            b.vy += (Math.random() - 0.5) * IDLE_KICK
          }

          if (b.y - b.r < 0)  { b.y = b.r;     b.vy =  Math.abs(b.vy) * RESTITUTION }
          if (b.y + b.r > h)  { b.y = h - b.r; b.vy = -Math.abs(b.vy) * RESTITUTION }
          if (b.side === 0) {
            if (b.x - b.r < 0)        { b.x = b.r;            b.vx =  Math.abs(b.vx) * RESTITUTION }
            if (b.x + b.r > leftEnd)  { b.x = leftEnd - b.r;  b.vx = -Math.abs(b.vx) * RESTITUTION }
          } else {
            if (b.x - b.r < rightStart) { b.x = rightStart + b.r; b.vx =  Math.abs(b.vx) * RESTITUTION }
            if (b.x + b.r > w)          { b.x = w - b.r;          b.vx = -Math.abs(b.vx) * RESTITUTION }
          }
        }

        // Collisioni pairwise con impulso elastico massa-pesato
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i], c = arr[j]
            if (a.side !== c.side) continue
            const dx = c.x - a.x, dy = c.y - a.y
            const dist = Math.hypot(dx, dy) || 0.001
            const overlap = a.r + c.r - dist
            if (overlap <= 0) continue

            const nx = dx / dist, ny = dy / dist
            // Separazione proporzionale all'inverso della massa
            const totalM = a.m + c.m
            const sA = overlap * (c.m / totalM)
            const sC = overlap * (a.m / totalM)
            a.x -= nx * sA; a.y -= ny * sA
            c.x += nx * sC; c.y += ny * sC

            // Velocità relativa lungo la normale: se positiva, si avvicinano
            const relVel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny
            if (relVel <= 0) continue  // già in allontanamento → nessun impulso

            const jImp = -(1 + RESTITUTION) * relVel / (1 / a.m + 1 / c.m)
            a.vx += (jImp / a.m) * nx
            a.vy += (jImp / a.m) * ny
            c.vx -= (jImp / c.m) * nx
            c.vy -= (jImp / c.m) * ny
          }
        }
      }
      for (const b of arr) {
        const el = refsRef.current[b.id]
        if (el) el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [blobs])

  if (blobs.length === 0) return null

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
    }}>
      {/* Shockwaves: anelli colorati che si espandono e dissolvono dal punto cliccato */}
      <AnimatePresence>
        {waves.map((wv) => (
          <motion.div
            key={wv.id}
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            onAnimationComplete={() => removeWave(wv.id)}
            style={{
              position: 'absolute',
              left: wv.x - SHOCK_RADIUS,
              top:  wv.y - SHOCK_RADIUS,
              width:  SHOCK_RADIUS * 2,
              height: SHOCK_RADIUS * 2,
              borderRadius: '50%',
              border: `4px solid ${wv.color}`,
              boxShadow: `0 0 24px ${wv.color}55`,
              pointerEvents: 'none',
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </AnimatePresence>
      {blobs.map((b) => (
        <div
          key={b.id}
          ref={(el) => { refsRef.current[b.id] = el }}
          onClick={() => onClickBlob(b.id)}
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: b.r * 2,
            height: b.r * 2,
            willChange: 'transform',
            transform: `translate(${b.x - b.r}px, ${b.y - b.r}px)`,
            pointerEvents: 'auto',
            cursor: 'pointer',
            borderRadius: '50%',  // restringe l'hitbox al cerchio del blob
          }}
        >
          <Blob
            color={b.color}
            id={b.id}
            size="100%"
            expr={exprMap[b.id] || 'normal'}
            animate={false}
            style={{ position: 'static' }}
          />
        </div>
      ))}
    </div>
  )
}

export default FloatingBlobs
