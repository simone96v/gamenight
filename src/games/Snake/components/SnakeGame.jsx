// Canvas renderer + game loop per Snake.
// L'engine vive in un ref; il canvas si ridimensiona sul container.
// Render: griglia leggera, cibo (pillola), serpente fatto di "blob" connessi con
// gradiente verso il colore del player. Occhi solo sulla testa, espressione
// che lampeggia ogni pochi secondi.

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { SnakeEngine, COLS, ROWS } from '../engine/GameEngine'
import { InputHandler } from '../engine/input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

// Padding interno (in px) intorno alla griglia per dare aria
const FIELD_PAD = 10

function lerpHex(a, b, t) {
  const ah = a.replace('#', '')
  const bh = b.replace('#', '')
  const ar = parseInt(ah.slice(0, 2), 16)
  const ag = parseInt(ah.slice(2, 4), 16)
  const ab = parseInt(ah.slice(4, 6), 16)
  const br = parseInt(bh.slice(0, 2), 16)
  const bg = parseInt(bh.slice(2, 4), 16)
  const bb = parseInt(bh.slice(4, 6), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  const hex = (n) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(bl)}`
}

const SnakeGame = forwardRef(function SnakeGame(
  { seed, blobColor, onScoreUpdate, onDeath, onEat },
  ref,
) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const inputRef = useRef(null)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0, cell: 0, ox: 0, oy: 0, dpr: 1 })

  useImperativeHandle(ref, () => ({
    getEngine: () => engineRef.current,
  }), [])

  // Setup canvas size + DPR + ridimensionamento al container
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      // Cella massima che entra in entrambe le dimensioni rispettando la griglia COLS x ROWS
      const cell = Math.floor(Math.min(
        (w - FIELD_PAD * 2) / COLS,
        (h - FIELD_PAD * 2) / ROWS,
      ))
      const fieldW = cell * COLS
      const fieldH = cell * ROWS
      const ox = Math.floor((w - fieldW) / 2)
      const oy = Math.floor((h - fieldH) / 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      sizeRef.current = { w, h, cell, ox, oy, dpr }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    window.addEventListener('orientationchange', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', resize)
    }
  }, [])

  // Engine + input + loop di rendering
  useEffect(() => {
    const engine = new SnakeEngine({
      seed,
      onScore: (s) => onScoreUpdate?.(s),
      onDeath: (s) => onDeath?.(s),
      onEat: (s) => onEat?.(s),
    })
    engineRef.current = engine

    const surface = containerRef.current
    const input = new InputHandler(engine)
    input.attach(surface)
    inputRef.current = input

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const accentLight = BLOB_GRADIENTS[blobColor]?.[0] || blobColor
    const accentDark = blobColor

    const draw = (ts) => {
      engine.update(ts)
      const { w, h, cell, ox, oy, dpr } = sizeRef.current
      if (!w || !h || !cell) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // Sfondo del campo (più chiaro del bg pagina, per separare visivamente)
      ctx.fillStyle = 'rgba(0,0,0,0.04)'
      const r = 18
      roundRect(ctx, ox - 6, oy - 6, cell * COLS + 12, cell * ROWS + 12, r)
      ctx.fill()

      // Griglia leggera (linee diagonali tipo checker molto morbido)
      ctx.fillStyle = 'rgba(0,0,0,0.025)'
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
          }
        }
      }

      // Cibo (pillola: capsule con metà bianca e metà rossa)
      if (engine.food) {
        drawPill(ctx, ox + engine.food.x * cell, oy + engine.food.y * cell, cell, ts)
      }

      // Serpente — segmenti come blob connessi
      const snake = engine.snake
      const eyePulse = engine.timeSinceLastEat() < 240
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i]
        const cx = ox + seg.x * cell + cell / 2
        const cy = oy + seg.y * cell + cell / 2
        const tlen = snake.length > 1 ? i / (snake.length - 1) : 0
        // Testa più grande, coda più piccola
        const t = i === 0 ? 0 : i === snake.length - 1 ? 1 : tlen
        const size = cell * (0.92 - t * 0.18)
        // Colore: testa accentLight → coda accentDark
        const color = i === 0
          ? accentLight
          : lerpHex(accentLight, accentDark, Math.min(1, tlen * 1.1))

        drawBlobSegment(ctx, cx, cy, size, color, accentDark, i === 0, eyePulse, engine.dir)
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      input.detach()
      engineRef.current = null
      inputRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, blobColor])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'grab',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
})

// ────────── helpers di disegno ──────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawPill(ctx, x, y, cell, ts) {
  // Capsule disegnata orizzontalmente al centro della cella, con leggero bob
  const cx = x + cell / 2
  const cy = y + cell / 2 + Math.sin(ts / 200) * (cell * 0.04)
  const w = cell * 0.78
  const h = cell * 0.46
  const r = h / 2

  ctx.save()
  // Soft shadow under
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + h * 0.55, w * 0.42, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body (capsule)
  // Metà rossa sinistra, metà bianca destra
  // Disegno due semicapsule clippate al rettangolo metà
  ctx.save()
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r)
  ctx.clip()
  ctx.fillStyle = '#EF4444' // rosso
  ctx.fillRect(cx - w / 2, cy - h / 2, w / 2, h)
  ctx.fillStyle = '#F8FAFC' // bianco caldo
  ctx.fillRect(cx, cy - h / 2, w / 2, h)
  // Highlight glossy
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(cx, cy - h * 0.22, w * 0.34, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'
  ctx.lineWidth = Math.max(1.2, cell * 0.045)
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r)
  ctx.stroke()
  // Linea centrale tra le due metà
  ctx.beginPath()
  ctx.moveTo(cx, cy - h / 2 + 1)
  ctx.lineTo(cx, cy + h / 2 - 1)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = Math.max(0.8, cell * 0.025)
  ctx.stroke()

  ctx.restore()
}

function drawBlobSegment(ctx, cx, cy, size, color, darkColor, isHead, eyePulse, dir) {
  const r = size / 2

  // Drop shadow
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.6, r * 0.85, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Body fill — radial gradient (light top, dark bottom)
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.15, cx, cy, r)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.35, color)
  grad.addColorStop(1, darkColor)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2)
  ctx.fill()

  // Outline scuro
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = Math.max(1.2, size * 0.06)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2)
  ctx.stroke()

  // Highlight glossy
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.22, r * 0.1, -0.4, 0, Math.PI * 2)
  ctx.fill()

  if (!isHead) return

  // Occhi sulla testa, orientati verso la direzione
  const eyeOffset = r * 0.32
  let ex = 0
  let ey = 0
  switch (dir) {
    case 'up': ey = -eyeOffset * 0.2; ex = 0; break
    case 'down': ey = eyeOffset * 0.05; break
    case 'left': ex = -eyeOffset * 0.18; break
    case 'right': ex = eyeOffset * 0.18; break
    default: break
  }
  const eyeR = r * (eyePulse ? 0.18 : 0.16)
  const eyeSpread = r * 0.32
  // Eye whites
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx - eyeSpread + ex, cy - r * 0.05 + ey, eyeR, 0, Math.PI * 2)
  ctx.arc(cx + eyeSpread + ex, cy - r * 0.05 + ey, eyeR, 0, Math.PI * 2)
  ctx.fill()
  // Eye outlines
  ctx.lineWidth = Math.max(1, size * 0.025)
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.arc(cx - eyeSpread + ex, cy - r * 0.05 + ey, eyeR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + eyeSpread + ex, cy - r * 0.05 + ey, eyeR, 0, Math.PI * 2)
  ctx.stroke()
  // Pupils
  ctx.fillStyle = '#111827'
  const pupilR = eyeR * 0.55
  const px = dir === 'left' ? -eyeR * 0.25 : dir === 'right' ? eyeR * 0.25 : 0
  const py = dir === 'up' ? -eyeR * 0.2 : dir === 'down' ? eyeR * 0.2 : 0
  ctx.beginPath()
  ctx.arc(cx - eyeSpread + ex + px, cy - r * 0.05 + ey + py, pupilR, 0, Math.PI * 2)
  ctx.arc(cx + eyeSpread + ex + px, cy - r * 0.05 + ey + py, pupilR, 0, Math.PI * 2)
  ctx.fill()
  // Glints
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  const glint = pupilR * 0.35
  ctx.beginPath()
  ctx.arc(cx - eyeSpread + ex + px - pupilR * 0.3, cy - r * 0.05 + ey + py - pupilR * 0.3, glint, 0, Math.PI * 2)
  ctx.arc(cx + eyeSpread + ex + px - pupilR * 0.3, cy - r * 0.05 + ey + py - pupilR * 0.3, glint, 0, Math.PI * 2)
  ctx.fill()
}

export default SnakeGame
