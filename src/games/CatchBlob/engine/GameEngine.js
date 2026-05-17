import { GAME_WIDTH, GAME_HEIGHT, BASKET, ITEM, COMBO } from './physics'
import { createRNG } from './rng'
import { spawnItem, currentSpawnInterval } from './itemSpawner'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

// Paper background constants (consistent with BlobJump)
const PAPER_BG     = '#F8F6F0'
const PAPER_LINE   = 'rgba(155,148,135,0.18)'
const PAPER_MARGIN = 'rgba(210,70,70,0.09)'

function comboMultFor(hits) {
  let mult = 1
  for (const tier of COMBO) {
    if (hits >= tier.hits) mult = tier.mult
  }
  return mult
}

export class GameEngine {
  constructor(canvas, seed, blobColor, onScoreUpdate, onDeath) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.seed = seed
    this.blobColor = blobColor || '#8B5CF6'
    this.onScoreUpdate = onScoreUpdate
    this.onDeath = onDeath

    const grad = BLOB_GRADIENTS[this.blobColor]
    this.blobGrad = grad || [this.blobColor, this.blobColor, this.blobColor]

    this.rng = createRNG(seed)

    this.basket = {
      x: GAME_WIDTH / 2,
      vx: 0,
    }

    this.items = []
    this.particles = []

    this.score = 0
    this.combo = 0          // consecutive correct catches
    this.lastDeathReason = null

    this.elapsed = 0
    this.nextSpawnAt = 0    // schedule using elapsed-time accumulator

    this.isDead = false
    this.rafId = null
    this.lastTime = 0
    this.input = null

    // Visual feedback
    this.flashAlpha = 0     // green flash on good catch
    this.shakeMag = 0
    this.scorePulse = 0
    this.recentPickup = null // { text, color, x, y, life }
  }

  async start() {
    this.input = new InputManager(this.canvas)
    await this.input.init()
    this.lastTime = performance.now()
    this.loop()
  }

  loop = () => {
    const now = performance.now()
    const rawDt = (now - this.lastTime) / 1000
    const dt = Math.min(rawDt, 0.033)
    this.lastTime = now
    this.elapsed += dt

    this.update(dt)
    this.render()

    if (!this.isDead) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  // ── UPDATE ──────────────────────────────────────────────

  update(dt) {
    this.input.update(dt)

    // Basket movement
    const dir = this.input.getDirection()
    const target = dir * BASKET.MOVE_SPEED
    if (Math.abs(dir) > 0.01) {
      this.basket.vx += (target - this.basket.vx) * Math.min(1, BASKET.MOVE_ACCEL * dt)
    } else {
      this.basket.vx *= Math.pow(BASKET.MOVE_FRICTION, dt * 60)
      if (Math.abs(this.basket.vx) < 2) this.basket.vx = 0
    }
    this.basket.x += this.basket.vx * dt

    const halfW = BASKET.WIDTH / 2
    if (this.basket.x < halfW) { this.basket.x = halfW; this.basket.vx = 0 }
    if (this.basket.x > GAME_WIDTH - halfW) { this.basket.x = GAME_WIDTH - halfW; this.basket.vx = 0 }

    // Spawn schedule
    if (this.elapsed >= this.nextSpawnAt) {
      this.items.push(spawnItem(this.rng, this.elapsed, this.blobColor))
      this.nextSpawnAt = this.elapsed + currentSpawnInterval(this.elapsed)
    }

    // Update falling items
    const basketTop = BASKET.Y
    const basketLeft = this.basket.x - halfW
    const basketRight = this.basket.x + halfW

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]
      if (it.settled) continue

      it.vy += ITEM.FALL_GRAVITY * dt
      it.y += it.vy * dt
      it.rot += it.rotSpeed * dt

      const itemBottom = it.y + ITEM.RADIUS
      const itemLeft = it.x - ITEM.RADIUS * 0.65
      const itemRight = it.x + ITEM.RADIUS * 0.65

      // Catch detection: bottom of item crosses basket top with horizontal overlap
      if (itemBottom >= basketTop && itemBottom <= basketTop + 16 && it.vy > 0) {
        if (itemRight >= basketLeft && itemLeft <= basketRight) {
          this._handleCatch(it)
          this.items.splice(i, 1)
          continue
        }
      }

      // Missed: fully past basket
      if (it.y - ITEM.RADIUS > GAME_HEIGHT) {
        this._handleMiss(it)
        this.items.splice(i, 1)
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 380 * dt
      p.life -= dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }

    // Effects decay
    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 4
      if (this.flashAlpha < 0) this.flashAlpha = 0
    }
    if (this.shakeMag > 0) {
      this.shakeMag *= Math.pow(0.02, dt)
      if (this.shakeMag < 0.3) this.shakeMag = 0
    }
    if (this.scorePulse > 0) {
      this.scorePulse -= dt * 4
      if (this.scorePulse < 0) this.scorePulse = 0
    }
    if (this.recentPickup) {
      this.recentPickup.life -= dt
      this.recentPickup.y -= 40 * dt
      if (this.recentPickup.life <= 0) this.recentPickup = null
    }
  }

  _handleCatch(item) {
    if (item.kind === 'right') {
      this.combo++
      const mult = comboMultFor(this.combo)
      const pts = Math.round(10 * mult)
      this.score += pts
      this.flashAlpha = 0.35
      this.scorePulse = 1
      this._spawnBurst(item.x, BASKET.Y, item.color, 10)
      this._showPickup(`+${pts}`, item.color, item.x, BASKET.Y - 10)
      this.onScoreUpdate?.(this.score)
    } else if (item.kind === 'star') {
      this.score += 50
      this.flashAlpha = 0.45
      this.scorePulse = 1
      this._spawnBurst(item.x, BASKET.Y, '#facc15', 14)
      this._showPickup('+50 ⭐', '#facc15', item.x, BASKET.Y - 10)
      this.onScoreUpdate?.(this.score)
    } else if (item.kind === 'wrong') {
      this.lastDeathReason = 'wrong_color'
      this._spawnBurst(item.x, BASKET.Y, item.color, 16)
      this.shakeMag = 10
      this.die()
    } else if (item.kind === 'bomb') {
      this.lastDeathReason = 'bomb'
      this._spawnBurst(item.x, BASKET.Y, '#1a1a1a', 22)
      this._spawnBurst(item.x, BASKET.Y, '#dc2626', 14)
      this.shakeMag = 18
      this.die()
    }
  }

  _handleMiss(item) {
    if (item.kind === 'right') {
      this.lastDeathReason = 'missed_right'
      this._spawnBurst(item.x, GAME_HEIGHT - 10, item.color, 12)
      this.shakeMag = 8
      this.die()
    }
    // wrong / bomb / star missed: no penalty
  }

  _spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4
      const speed = 80 + Math.random() * 220
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        life: 0.4 + Math.random() * 0.4,
      })
    }
  }

  _showPickup(text, color, x, y) {
    this.recentPickup = { text, color, x, y, life: 0.8 }
  }

  die() {
    this.isDead = true
    this.onDeath?.(this.score, this.lastDeathReason)
    // Render one final frame with overlay later — engine stops after this tick
  }

  // ── RENDER ──────────────────────────────────────────────

  render() {
    const ctx = this.ctx

    ctx.save()
    if (this.shakeMag > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeMag * 2, (Math.random() - 0.5) * this.shakeMag * 2)
    }

    ctx.clearRect(-5, -5, GAME_WIDTH + 10, GAME_HEIGHT + 10)

    this._drawBackground(ctx)
    this._drawItems(ctx)
    this._drawBasket(ctx)
    this._drawParticles(ctx)
    this._drawPickup(ctx)

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(34, 197, 94, ${this.flashAlpha})`
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }

    ctx.restore()
  }

  _drawBackground(ctx) {
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    // Horizontal ruled lines
    const lineSpacing = 30
    ctx.strokeStyle = PAPER_LINE
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let ly = 0; ly <= GAME_HEIGHT; ly += lineSpacing) {
      ctx.moveTo(0, ly)
      ctx.lineTo(GAME_WIDTH, ly)
    }
    ctx.stroke()
    // Margin
    ctx.strokeStyle = PAPER_MARGIN
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(30, GAME_HEIGHT)
    ctx.stroke()
  }

  _drawItems(ctx) {
    for (const it of this.items) {
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot)
      if (it.kind === 'right' || it.kind === 'wrong') {
        this._drawBlobItem(ctx, ITEM.RADIUS, it.color, it.kind === 'wrong')
      } else if (it.kind === 'bomb') {
        this._drawBomb(ctx, ITEM.RADIUS)
      } else if (it.kind === 'star') {
        this._drawStar(ctx, ITEM.RADIUS)
      }
      ctx.restore()
    }
  }

  _drawBlobItem(ctx, r, hex, isWrong) {
    const grad = BLOB_GRADIENTS[hex] || [hex, hex, hex]
    const [light, mid, dark] = grad
    // Body
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, r * 0.1, r * 1.1)
    bodyGrad.addColorStop(0, light)
    bodyGrad.addColorStop(0.55, mid)
    bodyGrad.addColorStop(1, dark)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    // Highlight
    ctx.fillStyle = light
    ctx.globalAlpha = 0.85
    ctx.save()
    ctx.translate(-r * 0.38, -r * 0.49)
    ctx.rotate(-Math.PI / 6)
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.18, r * 0.11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.globalAlpha = 1
    // Eyes (canonical: spacing 0.38r, y -0.30r, rx 0.26r, ry 0.31r)
    const OUTLINE = '#1F2937'
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const eyeRx = r * 0.26
    const eyeRy = r * 0.31
    const hlR = r * 0.07
    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing
      ctx.fillStyle = OUTLINE
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + eyeRx * 0.32, eyeY - eyeRy * 0.33, hlR, 0, Math.PI * 2)
      ctx.fill()
    }
    // Smile
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = Math.max(2, r * 0.054)
    ctx.lineCap = 'round'
    const mouthW = r * 0.21
    const mouthY = r * 0.05
    ctx.beginPath()
    ctx.moveTo(-mouthW, mouthY)
    ctx.quadraticCurveTo(0, mouthY + r * 0.11, mouthW, mouthY)
    ctx.stroke()
    ctx.lineCap = 'butt'

    // Wrong-color tag: subtle pencil "×" badge in top-right (cue you should avoid)
    if (isWrong) {
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.55)'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      const bx = r * 0.65, by = -r * 0.7, s = r * 0.18
      ctx.beginPath()
      ctx.moveTo(bx - s, by - s); ctx.lineTo(bx + s, by + s)
      ctx.moveTo(bx + s, by - s); ctx.lineTo(bx - s, by + s)
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
  }

  _drawBomb(ctx, r) {
    // Body
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, r * 0.1, r * 1.1)
    grad.addColorStop(0, '#525252')
    grad.addColorStop(0.5, '#262626')
    grad.addColorStop(1, '#0a0a0a')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(-r * 0.3, -r * 0.35, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    // Fuse
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.quadraticCurveTo(r * 0.4, -r * 1.2, r * 0.55, -r * 1.5)
    ctx.stroke()
    // Spark
    const sparkR = 2 + Math.random() * 1.5
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(r * 0.55, -r * 1.5, sparkR, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.arc(r * 0.55, -r * 1.5, sparkR * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineCap = 'butt'
  }

  _drawStar(ctx, r) {
    const outer = r
    const inner = r * 0.45
    const points = 5
    ctx.fillStyle = '#facc15'
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * radius
      const py = Math.sin(a) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // Sparkle
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawBasket(ctx) {
    const x = this.basket.x
    const y = BASKET.Y
    const w = BASKET.WIDTH
    const h = BASKET.HEIGHT

    // Shadow under basket
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    ctx.beginPath()
    ctx.ellipse(x, y + h + 4, w * 0.5, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Basket body (trapezoid wicker)
    ctx.save()
    ctx.translate(x, y)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#b45309')
    grad.addColorStop(1, '#78350f')
    ctx.fillStyle = grad
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-w / 2, 0)
    ctx.lineTo(w / 2, 0)
    ctx.lineTo(w / 2 - 8, h)
    ctx.lineTo(-w / 2 + 8, h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Wicker cross-hatch
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const py = (h / 4) * i
      ctx.beginPath()
      ctx.moveTo(-w / 2 + i * 2, py)
      ctx.lineTo(w / 2 - i * 2, py)
      ctx.stroke()
    }
    for (let i = -2; i <= 2; i++) {
      const px = i * (w / 5)
      ctx.beginPath()
      ctx.moveTo(px, 2)
      ctx.lineTo(px * 0.7, h - 2)
      ctx.stroke()
    }

    // Top rim (catch surface)
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 1, 0)
    ctx.lineTo(w / 2 - 1, 0)
    ctx.stroke()
    // Rim highlight
    ctx.strokeStyle = 'rgba(254, 215, 170, 0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 3, -1)
    ctx.lineTo(w / 2 - 3, -1)
    ctx.stroke()

    // Handle (curved on top)
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 10, -1)
    ctx.quadraticCurveTo(0, -22, w / 2 - 10, -1)
    ctx.stroke()

    ctx.lineCap = 'butt'
    ctx.restore()
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, p.life * 1.6)
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawPickup(ctx) {
    if (!this.recentPickup) return
    const p = this.recentPickup
    const alpha = Math.min(1, p.life * 1.5)
    ctx.font = 'bold 18px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`
    ctx.fillText(p.text, p.x + 1, p.y + 1)
    ctx.fillStyle = p.color
    ctx.globalAlpha = alpha
    ctx.fillText(p.text, p.x, p.y)
    ctx.globalAlpha = 1
    ctx.textAlign = 'start'
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.input?.destroy()
  }
}
