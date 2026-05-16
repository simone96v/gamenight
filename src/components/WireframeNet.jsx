// Rete wireframe interattiva in canvas — sfondo per le pagine non di gioco.
// Particelle che fluttuano e si connettono, reagiscono al mouse/touch.

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../stores/useSettings'

// Rotte dove la rete NON deve apparire (gameplay attivo)
const HIDDEN_ROUTES = [/^\/game\//, /^\/test\//]

const isHidden = (pathname) => HIDDEN_ROUTES.some((r) => r.test(pathname))

const isMobile = () => window.innerWidth < 600

const WireframeNet = () => {
  const { pathname } = useLocation()
  const theme = useSettings((s) => s.theme)
  const canvasRef = useRef(null)
  const stateRef = useRef(null)

  if (isHidden(pathname)) return null

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
        opacity: theme === 'dark' ? 0.18 : 0.13,
        transition: 'opacity 0.4s',
      }}
    />
  )
}

// Hook separato che gestisce il canvas animation loop
const WireframeNetInner = ({ canvasRef, theme }) => {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const COUNT = isMobile() ? 35 : 60
    const CONNECT_DIST = isMobile() ? 100 : 140
    const MOUSE_RADIUS = 130
    const SPEED = 0.28
    const DOT_R = 1.8

    let W, H, particles, mouse, raf

    mouse = { x: -9999, y: -9999 }

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    const mkParticle = () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
    })

    const init = () => {
      resize()
      particles = Array.from({ length: COUNT }, mkParticle)
    }

    const onMove = (x, y) => { mouse.x = x; mouse.y = y }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }

    const onMouseMove = (e) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (t) onMove(t.clientX, t.clientY)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onLeave)
    window.addEventListener('resize', resize)

    // Colore base in base al tema
    const color = theme === 'dark' ? '180,160,255' : '100,70,220'

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Aggiorna posizioni
      for (const p of particles) {
        // Attrazione/repulsione mouse
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.012
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        // Smorzamento velocità (evita accumulo)
        p.vx *= 0.995
        p.vy *= 0.995

        // Limita velocità massima
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > SPEED * 3) {
          p.vx = (p.vx / speed) * SPEED * 3
          p.vy = (p.vy / speed) * SPEED * 3
        }

        p.x += p.vx
        p.y += p.vy

        // Rimbalzo ai bordi
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > W) { p.x = W; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > H) { p.y = H; p.vy *= -1 }
      }

      // Disegna connessioni
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < CONNECT_DIST) {
            const alpha = (1 - d / CONNECT_DIST) * 0.55
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${color},${alpha})`
            ctx.lineWidth = 0.8
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Disegna nodi
      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const near = Math.sqrt(dx * dx + dy * dy) < MOUSE_RADIUS * 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, near ? DOT_R * 1.6 : DOT_R, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color},${near ? 0.7 : 0.4})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    init()
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef, theme])

  return null
}

// Componente finale: canvas + loop separato
const WireframeNetFull = () => {
  const { pathname } = useLocation()
  const theme = useSettings((s) => s.theme)
  const canvasRef = useRef(null)

  if (isHidden(pathname)) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 9,
          pointerEvents: 'none',
          opacity: theme === 'dark' ? 0.28 : 0.18,
          transition: 'opacity 0.4s',
        }}
      />
      <WireframeNetInner canvasRef={canvasRef} theme={theme} />
    </>
  )
}

export default WireframeNetFull
