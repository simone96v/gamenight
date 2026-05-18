// BlobDig engine. Render canvas + input bipartito (tap-left / tap-right).
//
// Stato:
//   blob: { col: -1 | +1 } posizione orizzontale relativa (sx = -1, dx = +1)
//   rows: array di { left, right } generate finora; index 0 = riga del blob
//   depth: metri scavati (= rows.length - 1; cresce di 1 ad ogni dig)
//   score: depth + bonus gemme/tesori
//   alive: bool
//
// Loop:
//   Quando l'utente tappa LEFT/RIGHT → consume 1 metro:
//   1. Determina la cella di destinazione (rows[depth+1].left o .right)
//   2. Se LAVA → alive=false, callbacks.onDeath()
//   3. Altrimenti score += depth_bonus(1) + cell_points; depth++
//   4. Scroll camera per mostrare blob nella sua nuova posizione
//   5. Pre-genera N righe avanti per smooth scroll

import { makeRng } from './rng'
import { generateRow, CELL, CELL_POINTS } from './grid'

const PREFETCH_ROWS = 12   // numero di righe da tenere pre-generate sotto al blob
const CELL_SIZE = 84       // px (verrà scalato in CSS)
const SCROLL_LERP = 0.18

export class GameEngine {
  constructor({ seed, canvas, blobColor, callbacks }) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.blobColor = blobColor || '#8B5CF6'
    this.callbacks = callbacks || {}
    this.rng = makeRng(seed >>> 0)

    // Camera scrolla in pixel — y rappresenta quanti px è scrolato verso il basso
    // rispetto alla posizione iniziale (riga 0 = top).
    this.cameraY = 0
    this.targetCameraY = 0

    // Rows: index 0 = la riga del blob attuale (sempre "vuota" dove sta il blob).
    // rows[0] è generata al boot; rows[1+] pre-fetched.
    this.rows = []
    this._prefetchRows(PREFETCH_ROWS)

    this.depth = 0
    this.score = 0
    this.alive = true
    this.blobCol = 0            // -1 = sx, 0 = centro (start), 1 = dx
    this.blobOffsetX = 0        // animazione orizzontale, lerp verso target
    this.targetBlobX = 0

    this.lastFrame = 0
    this.running = false
  }

  _prefetchRows(n) {
    const start = this.rows.length
    for (let i = 0; i < n; i++) {
      this.rows.push(generateRow(start + i, this.rng))
    }
  }

  // Input handler: 'left' o 'right'. Chiamato dalla UI sui tap.
  tap(side) {
    if (!this.alive) return
    const nextRow = this.rows[this.depth + 1]
    if (!nextRow) return
    const cell = side === 'left' ? nextRow.left : nextRow.right

    if (cell === CELL.LAVA) {
      this.alive = false
      // Forziamo blob nella cella di lava per il render del frame morte.
      this.blobCol = side === 'left' ? -1 : 1
      this.targetBlobX = this.blobCol
      this.callbacks.onDeath?.(this.score, { reason: 'lava' })
      return
    }

    // Avanza: aggiorna depth, score, posizione blob, camera target.
    this.depth += 1
    this.score += 1 + (CELL_POINTS[cell] || 0)
    this.blobCol = side === 'left' ? -1 : 1
    this.targetBlobX = this.blobCol
    this.targetCameraY += CELL_SIZE
    this.callbacks.onDig?.(cell, this.score, this.depth)

    if (cell === CELL.GEM) this.callbacks.onGem?.()
    if (cell === CELL.TREASURE) this.callbacks.onTreasure?.()

    // Pre-genera nuove righe se ci stiamo avvicinando al fondo del buffer.
    if (this.rows.length - this.depth < PREFETCH_ROWS) {
      this._prefetchRows(PREFETCH_ROWS)
    }
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastFrame = performance.now()
    const loop = (t) => {
      if (!this.running) return
      const dt = Math.min(50, t - this.lastFrame) / 1000
      this.lastFrame = t
      this._tick(dt)
      this._render()
      this._raf = requestAnimationFrame(loop)
    }
    this._raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  _tick() {
    // Smooth camera + blob X position.
    this.cameraY += (this.targetCameraY - this.cameraY) * SCROLL_LERP
    this.blobOffsetX += (this.targetBlobX - this.blobOffsetX) * SCROLL_LERP
  }

  _render() {
    const c = this.canvas
    const ctx = this.ctx
    const W = c.clientWidth
    const H = c.clientHeight
    if (c.width !== W * devicePixelRatio || c.height !== H * devicePixelRatio) {
      c.width = W * devicePixelRatio
      c.height = H * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    // Background gradient (verso il basso = più scuro).
    const depthRamp = Math.min(1, this.depth / 200)
    const bgTop = lerpColor('#5B3A1F', '#1A0A04', depthRamp)
    const bgBot = lerpColor('#3B2614', '#0A0402', depthRamp)
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, bgTop)
    grad.addColorStop(1, bgBot)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Dimensione cella adattata alla larghezza.
    const cellW = W / 2
    const cellH = cellW * 0.7

    // Posizione iniziale blob in pixel (centro orizzontale, riga 0 in alto).
    const blobInitialY = H * 0.32

    // Render rows visible. Index r = depth (riga corrente blob), r+1, r+2, ...
    // ognuna è 1 cellH sotto la precedente.
    for (let i = 0; i < PREFETCH_ROWS; i++) {
      const rowIdx = this.depth + 1 + i
      const row = this.rows[rowIdx]
      if (!row) break
      const y = blobInitialY + (i + 1) * cellH - (this.cameraY - this.depth * cellH)
      if (y < -cellH || y > H + cellH) continue
      this._drawCell(ctx, 0, y, cellW, cellH, row.left)
      this._drawCell(ctx, cellW, y, cellW, cellH, row.right)
    }

    // Indicatore "scegli" sotto al blob: due frecce semi-trasparenti.
    if (this.alive) {
      const arrowY = blobInitialY + cellH * 0.5
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = `${cellH * 0.4}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('↙', cellW * 0.5, arrowY)
      ctx.fillText('↘', cellW * 1.5, arrowY)
    }

    // Render blob (sopra a tutto).
    const blobX = W * 0.5 + this.blobOffsetX * cellW * 0.5
    const blobY = blobInitialY
    this._drawBlob(ctx, blobX, blobY, cellH * 0.45)

    // HUD: depth + gem score
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `900 ${Math.round(cellH * 0.28)}px 'Baloo 2', sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${this.depth} m`, 14, 14)
    ctx.textAlign = 'right'
    ctx.fillText(`★ ${this.score}`, W - 14, 14)
  }

  _drawCell(ctx, x, y, w, h, cell) {
    // Bordo cella (sottile)
    ctx.fillStyle = '#000'
    ctx.fillRect(x, y, w, h)

    const pad = 2
    if (cell === CELL.LAVA) {
      // Lava: gradient arancione → rosso
      const g = ctx.createLinearGradient(x, y, x, y + h)
      g.addColorStop(0, '#FB923C')
      g.addColorStop(0.5, '#F97316')
      g.addColorStop(1, '#7C2D12')
      ctx.fillStyle = g
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2)
      // Bolla
      ctx.fillStyle = '#FED7AA'
      ctx.beginPath()
      ctx.arc(x + w * 0.65, y + h * 0.4, h * 0.07, 0, Math.PI * 2)
      ctx.fill()
    } else if (cell === CELL.DIRT) {
      // Terra: marrone con piccoli sassolini
      ctx.fillStyle = '#8B5A2B'
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.4, 3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + w * 0.65, y + h * 0.7, 4, 0, Math.PI * 2); ctx.fill()
    } else if (cell === CELL.GEM) {
      // Terra + gemma centrale
      ctx.fillStyle = '#8B5A2B'
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2)
      // Diamond
      const cx = x + w / 2, cy = y + h / 2, gs = h * 0.22
      ctx.fillStyle = '#22D3EE'
      ctx.beginPath()
      ctx.moveTo(cx, cy - gs)
      ctx.lineTo(cx + gs, cy)
      ctx.lineTo(cx, cy + gs)
      ctx.lineTo(cx - gs, cy)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#0E7490'
      ctx.lineWidth = 2
      ctx.stroke()
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.moveTo(cx, cy - gs)
      ctx.lineTo(cx + gs * 0.4, cy - gs * 0.2)
      ctx.lineTo(cx, cy)
      ctx.closePath()
      ctx.fill()
    } else if (cell === CELL.TREASURE) {
      // Forziere oro
      ctx.fillStyle = '#8B5A2B'
      ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2)
      const tx = x + w * 0.3, ty = y + h * 0.35, tw = w * 0.4, th = h * 0.3
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(tx, ty, tw, th)
      ctx.fillStyle = '#FBBF24'
      ctx.fillRect(tx, ty, tw, th * 0.3)
      ctx.strokeStyle = '#78350F'
      ctx.lineWidth = 2
      ctx.strokeRect(tx, ty, tw, th)
      ctx.fillStyle = '#78350F'
      ctx.fillRect(tx + tw * 0.45, ty + th * 0.3, tw * 0.1, th * 0.3)
    }
  }

  _drawBlob(ctx, cx, cy, r) {
    // Body
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.2, cx, cy, r)
    grad.addColorStop(0, lightenColor(this.blobColor, 0.4))
    grad.addColorStop(1, this.blobColor)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth = 3
    ctx.stroke()
    // Eyes
    ctx.fillStyle = '#1F2937'
    ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + r * 0.32, cy - r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.26, r * 0.06, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + r * 0.36, cy - r * 0.26, r * 0.06, 0, Math.PI * 2); ctx.fill()
    // Smile
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy + r * 0.15, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }
}

// ── color utils inline ───────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lerpColor(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}
function lightenColor(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  const m = (c) => Math.round(c + (255 - c) * amt)
  return `rgb(${m(r)},${m(g)},${m(b)})`
}
