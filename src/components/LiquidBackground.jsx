// Background interattivo: blob morbidi che fluttuano e reagiscono al mouse/touch.
// Canvas fullscreen, pointer-events: none. Non appare nelle schermate di gioco.

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../stores/useSettings'

const HIDDEN_ROUTES = [/^\/game\//, /^\/test\//]
const isHidden = (p) => HIDDEN_ROUTES.some((r) => r.test(p))

// Palette — light mode
const BLOBS_LIGHT = [
  { r: 220, g: 160, b: 255 }, // viola
  { r: 155, g: 200, b: 255 }, // blu
  { r: 130, g: 230, b: 200 }, // verde-acqua
  { r: 255, g: 200, b: 130 }, // giallo-oro
  { r: 255, g: 160, b: 180 }, // rosa
]

// Palette — dark mode (più saturi, luminosi)
const BLOBS_DARK = [
  { r: 140, g: 80,  b: 220 }, // viola
  { r: 60,  g: 130, b: 220 }, // blu
  { r: 40,  g: 180, b: 150 }, // verde
  { r: 220, g: 150, b: 40  }, // giallo
  { r: 220, g: 80,  b: 140 }, // rosa
]

const LiquidBackground = () => {
  const { pathname } = useLocation()
  const theme = useSettings((s) => s.theme)
  const canvasRef = useRef(null)
  const hidden = isHidden(pathname)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const palette = theme === 'dark' ? BLOBS_DARK : BLOBS_LIGHT
    const BASE_ALPHA = theme === 'dark' ? 0.13 : 0.22

    let W, H, blobs, mouse, raf

    mouse = { x: -9999, y: -9999 }

    const resize = () => {
      const prevW = W, prevH = H
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      // Scala le posizioni proporzionalmente così i blob restano distribuiti
      if (blobs && prevW && prevH) {
        blobs.forEach((b) => {
          b.x = (b.x / prevW) * W
          b.y = (b.y / prevH) * H
          b.radius = Math.min(W, H) * (0.28 + Math.random() * 0.18)
        })
      }
    }

    const init = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight

      blobs = palette.map((color) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.min(W, H) * (0.28 + Math.random() * 0.18),
        color,
        phase: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.14,
      }))
    }

    const onMove = (x, y) => { mouse.x = x; mouse.y = y }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }
    const onMouse = (e) => onMove(e.clientX, e.clientY)
    const onTouch = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY) }

    window.addEventListener('mousemove', onMouse)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onLeave)
    window.addEventListener('resize', resize)

    let t = 0
    const MOUSE_R = 200

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.004

      for (const b of blobs) {
        // Moto ondulatorio naturale — guida il blob in traiettorie fluide
        b.vx += Math.cos(t * b.speed + b.phase) * 0.012
        b.vy += Math.sin(t * b.speed + b.phase + 1.2) * 0.012

        // Repulsione morbida dal mouse
        const dx = b.x - mouse.x
        const dy = b.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_R && dist > 0) {
          const force = ((MOUSE_R - dist) / MOUSE_R) * 0.06
          b.vx += (dx / dist) * force
          b.vy += (dy / dist) * force
        }

        // Smorzamento leggero — mantiene il moto senza fermarsi
        b.vx *= 0.985
        b.vy *= 0.985

        // Velocità massima
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        if (spd > 1.4) { b.vx = b.vx / spd * 1.4; b.vy = b.vy / spd * 1.4 }

        b.x += b.vx
        b.y += b.vy

        // Rimbalzo morbido dai bordi — il blob inverte direzione quando esce
        const edge = b.radius * 0.15
        if (b.x < edge)     { b.x = edge;     b.vx = Math.abs(b.vx) * 0.6 }
        if (b.x > W - edge) { b.x = W - edge; b.vx = -Math.abs(b.vx) * 0.6 }
        if (b.y < edge)     { b.y = edge;     b.vy = Math.abs(b.vy) * 0.6 }
        if (b.y > H - edge) { b.y = H - edge; b.vy = -Math.abs(b.vy) * 0.6 }

        // Disegna blob con gradiente radiale
        const { r, g, b: blue } = b.color
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius)
        grad.addColorStop(0,   `rgba(${r},${g},${blue},${BASE_ALPHA})`)
        grad.addColorStop(0.5, `rgba(${r},${g},${blue},${BASE_ALPHA * 0.5})`)
        grad.addColorStop(1,   `rgba(${r},${g},${blue},0)`)

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    init()
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: hidden ? 'none' : 'block',
      }}
    />
  )
}

export default LiquidBackground
