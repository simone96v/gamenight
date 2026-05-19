import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, PIPE, GROUND, clamp } from './physics'
import { createRNG } from './rng'
import { generatePipes, extendPipes, currentSpeed } from './pipeGenerator'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

// Minimal paper background (canonical arcade bg, matches BlobJump/CatchBlob)
const PAPER_BG = '#F8F6F0'

export class GameEngine {
  constructor(canvas, seed, blobColor, onScoreUpdate, onDeath, onStart) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.seed = seed | 0
    this.blobColor = blobColor || '#F59E0B'
    this.onScoreUpdate = onScoreUpdate
    this.onDeath = onDeath
    this.onStart = onStart

    this.blobGrad = BLOB_GRADIENTS[this.blobColor] || [this.blobColor, this.blobColor, this.blobColor]

    this.rng = createRNG(this.seed)
    this.pipes = generatePipes(this.rng, 8)

    // Blob state
    this.blob = {
      x: PHYSICS.BLOB_X,
      y: GAME_HEIGHT * 0.42,
      vy: 0,
      rotation: 0,
    }

    this.score = 0
    this.bestScore = 0
    this.isDead = false
    this.started = false      // first flap starts the game (blob hovers before)
    this.elapsed = 0
    this.lastTime = 0
    this.rafId = null
    this.input = null

    // FX state
    this.flapSquash = 0       // 0..1, decays
    this.flapPuffs = []
    this.feathers = []
    this.scorePulse = 0
    this.screenShake = 0
    this.deathFlash = 0
    this.groundScroll = 0

    // Pre-game hover (sine bob)
    this.hoverPhase = 0
  }

  async start() {
    this.input = new InputManager(this.canvas, () => this._handleFlap())
    await this.input.init()
    this.lastTime = performance.now()
    this.loop()
  }

  _handleFlap() {
    if (this.isDead) return
    if (!this.started) {
      this.started = true
      this.onStart?.()
    }
    this.blob.vy = PHYSICS.FLAP_VELOCITY
    this.flapSquash = 1
    this._spawnFlapPuff()
  }

  flap() { this._handleFlap() }

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
    const blob = this.blob
    const speed = currentSpeed(this.score)

    if (!this.started) {
      // Idle hover
      this.hoverPhase += dt * 2.4
      blob.y = GAME_HEIGHT * 0.42 + Math.sin(this.hoverPhase) * 8
      blob.vy = Math.cos(this.hoverPhase) * 8 * 2.4
      blob.rotation = Math.sin(this.hoverPhase) * 0.05
      this._updateFx(dt)
      return
    }

    // Physics
    blob.vy += PHYSICS.GRAVITY * dt
    if (blob.vy > PHYSICS.MAX_FALL_SPEED) blob.vy = PHYSICS.MAX_FALL_SPEED
    blob.y += blob.vy * dt

    // Rotation: -25° rising → +75° falling
    const targetRot = blob.vy < 0
      ? -0.45 * Math.min(1, -blob.vy / 380)
      : 1.3 * Math.min(1, blob.vy / 600)
    const rotLerp = 1 - Math.pow(0.001, dt)
    blob.rotation += (targetRot - blob.rotation) * rotLerp

    // Scroll pipes
    for (const p of this.pipes) p.x -= speed * dt

    // Spawn new pipes when buffer is low
    const lastPipe = this.pipes[this.pipes.length - 1]
    if (lastPipe && lastPipe.x < GAME_WIDTH + 400) {
      extendPipes(this.rng, this.pipes, 4)
    }

    // Despawn off-screen pipes (always keep at least 4 ahead-or-current)
    while (this.pipes.length > 8 && this.pipes[0].x + this.pipes[0].width < -40) {
      this.pipes.shift()
    }

    // Scoring + collision
    const r = PHYSICS.BLOB_RADIUS * PHYSICS.HITBOX_SHRINK
    const bLeft = blob.x - r
    const bRight = blob.x + r
    const bTop = blob.y - r
    const bBottom = blob.y + r

    for (const p of this.pipes) {
      const pLeft = p.x
      const pRight = p.x + p.width
      // Score when blob passes the pipe center
      if (!p.passed && pRight < blob.x) {
        p.passed = true
        this.score += 1
        this.scorePulse = 1
        this.onScoreUpdate?.(this.score)
      }

      // AABB overlap with horizontal range
      if (bRight > pLeft && bLeft < pRight) {
        const gapTop = p.gapY - p.gapH / 2
        const gapBottom = p.gapY + p.gapH / 2
        if (bTop < gapTop || bBottom > gapBottom) {
          this.die()
          return
        }
      }
    }

    // Ground / ceiling collision
    const groundY = GAME_HEIGHT - GROUND.HEIGHT
    if (bBottom >= groundY) {
      blob.y = groundY - r
      this.die()
      return
    }
    if (bTop < -10) {
      blob.y = -10 + r
      blob.vy = Math.max(blob.vy, 0)
    }

    // Ground scroll
    this.groundScroll = (this.groundScroll + speed * dt) % 40

    this._updateFx(dt)
  }

  _updateFx(dt) {
    // Flap squash decay
    if (this.flapSquash > 0) {
      this.flapSquash -= dt * 5
      if (this.flapSquash < 0) this.flapSquash = 0
    }
    if (this.scorePulse > 0) {
      this.scorePulse -= dt * 3
      if (this.scorePulse < 0) this.scorePulse = 0
    }
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.0001, dt)
      if (this.screenShake < 0.3) this.screenShake = 0
    }
    if (this.deathFlash > 0) {
      this.deathFlash -= dt * 2
      if (this.deathFlash < 0) this.deathFlash = 0
    }

    // Flap puffs
    for (let i = this.flapPuffs.length - 1; i >= 0; i--) {
      const f = this.flapPuffs[i]
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.size += dt * 20
      f.life -= dt
      if (f.life <= 0) this.flapPuffs.splice(i, 1)
    }

    // Feathers (death)
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const ft = this.feathers[i]
      ft.x += ft.vx * dt
      ft.y += ft.vy * dt
      ft.vy += 280 * dt
      ft.rot += ft.rotSpeed * dt
      ft.life -= dt
      if (ft.life <= 0) this.feathers.splice(i, 1)
    }
  }

  _spawnFlapPuff() {
    const b = this.blob
    for (let i = 0; i < 3; i++) {
      this.flapPuffs.push({
        x: b.x - 8 + (Math.random() - 0.5) * 10,
        y: b.y + 4 + Math.random() * 6,
        vx: -50 - Math.random() * 60,
        vy: 20 + Math.random() * 30,
        size: 5 + Math.random() * 4,
        life: 0.32,
      })
    }
  }

  _spawnDeathFeathers() {
    const b = this.blob
    for (let i = 0; i < 14; i++) {
      this.feathers.push({
        x: b.x,
        y: b.y,
        vx: (Math.random() - 0.5) * 320,
        vy: -120 - Math.random() * 180,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 14,
        size: 4 + Math.random() * 4,
        life: 0.9 + Math.random() * 0.4,
        color: i % 2 === 0 ? this.blobGrad[1] : this.blobGrad[0],
      })
    }
  }

  die() {
    if (this.isDead) return
    this.isDead = true
    this.screenShake = 8
    this.deathFlash = 1
    this._spawnDeathFeathers()
    this.input?.suspend()
    this._renderDeathFrame()
    this.onDeath?.(this.score)
  }

  // ── RENDER ──────────────────────────────────────────────

  render() {
    const ctx = this.ctx
    ctx.save()
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2
      const sy = (Math.random() - 0.5) * this.screenShake * 2
      ctx.translate(sx, sy)
    }

    ctx.clearRect(-5, -5, GAME_WIDTH + 10, GAME_HEIGHT + 10)

    this._drawBackground(ctx)
    this._drawPipes(ctx)
    this._drawGround(ctx)
    this._drawFlapPuffs(ctx)

    if (!this.isDead) {
      this._drawBlob(ctx, this.blob.x, this.blob.y, false)
    }
    this._drawFeathers(ctx)

    if (this.deathFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.deathFlash * 0.4})`
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }

    ctx.restore()
  }

  _drawBackground(ctx) {
    // Solid paper-bg base (matches BlobJump/CatchBlob canonical look)
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Subtle horizontal rules for depth — fixed, no parallax (minimal)
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'
    ctx.lineWidth = 1
    const spacing = 60
    ctx.beginPath()
    for (let y = spacing; y < GAME_HEIGHT; y += spacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(GAME_WIDTH, y)
    }
    ctx.stroke()
  }

  _drawPipes(ctx) {
    const [, mid, dark] = this.blobGrad
    for (const p of this.pipes) {
      if (p.x > GAME_WIDTH + 20 || p.x + p.width < -20) continue
      const gapTop = p.gapY - p.gapH / 2
      const gapBottom = p.gapY + p.gapH / 2
      this._drawPipeSegment(ctx, p.x, 0, p.width, gapTop, mid, dark)
      this._drawPipeSegment(ctx, p.x, gapBottom, p.width, GAME_HEIGHT - GROUND.HEIGHT - gapBottom, mid, dark)
    }
  }

  _drawPipeSegment(ctx, x, y, w, h, fill, stroke) {
    if (h <= 0) return
    const radius = 6
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    ctx.fill()

    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, radius - 0.5)
    ctx.stroke()
  }

  _drawGround(ctx) {
    const top = GAME_HEIGHT - GROUND.HEIGHT
    const [, mid, dark] = this.blobGrad

    // Flat band in player-dark
    ctx.fillStyle = dark
    ctx.fillRect(0, top, GAME_WIDTH, GROUND.HEIGHT)

    // Thin accent line (mid) on top edge
    ctx.fillStyle = mid
    ctx.fillRect(0, top, GAME_WIDTH, 3)

    // Scrolling subtle stripes (player-mid at low alpha)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    const stripeW = 20
    for (let x = -this.groundScroll; x < GAME_WIDTH + stripeW; x += stripeW * 2) {
      ctx.fillRect(x, top + 6, stripeW, GROUND.HEIGHT - 8)
    }
  }

  _drawFlapPuffs(ctx) {
    for (const f of this.flapPuffs) {
      const a = clamp(f.life / 0.32, 0, 1)
      ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawFeathers(ctx) {
    for (const ft of this.feathers) {
      const a = clamp(ft.life / 1.0, 0, 1)
      ctx.save()
      ctx.translate(ft.x, ft.y)
      ctx.rotate(ft.rot)
      ctx.globalAlpha = a
      ctx.fillStyle = ft.color
      ctx.beginPath()
      ctx.ellipse(0, 0, ft.size, ft.size * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  // ── BLOB DRAWING ────────────────────────────────────────

  _drawBlob(ctx, x, y, isDead) {
    const r = PHYSICS.BLOB_RADIUS
    const blob = this.blob

    let scaleX = 1, scaleY = 1
    if (this.flapSquash > 0) {
      // Squash: wide & short on flap impulse
      const s = this.flapSquash
      scaleX = 1 + 0.18 * s
      scaleY = 1 - 0.18 * s
    } else if (blob.vy < -100) {
      const t = Math.min(1, -blob.vy / 400)
      scaleY = 1 + 0.12 * t
      scaleX = 1 - 0.08 * t
    } else if (blob.vy > 200) {
      const t = Math.min(1, blob.vy / 500)
      scaleY = 1 - 0.06 * t
      scaleX = 1 + 0.05 * t
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(blob.rotation)
    ctx.scale(scaleX, scaleY)

    // Tiny wing — flaps based on flapSquash
    this._drawWing(ctx, r, this.flapSquash)

    // Body
    const [light, mid, dark] = this.blobGrad
    const bodyGrad = ctx.createRadialGradient(-4, -5, 1, 0, 2, r * 1.1)
    bodyGrad.addColorStop(0, light)
    bodyGrad.addColorStop(0.55, mid)
    bodyGrad.addColorStop(1, dark)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Inner glow
    const glow = ctx.createRadialGradient(-3, -4, 0, 0, 0, r)
    glow.addColorStop(0, 'rgba(255,255,255,0.28)')
    glow.addColorStop(0.55, 'rgba(255,255,255,0)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Top-left shine (canonical proportions, see BlobJump)
    ctx.fillStyle = light
    ctx.globalAlpha = 0.85
    ctx.save()
    ctx.translate(-r * 0.38, -r * 0.49)
    ctx.rotate(-Math.PI / 6)
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.183, r * 0.115, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.globalAlpha = 1

    // Tiny beak (orange/dark)
    ctx.fillStyle = '#F97316'
    ctx.strokeStyle = '#9A3412'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(r * 0.55, -r * 0.05)
    ctx.lineTo(r * 1.05, r * 0.05)
    ctx.lineTo(r * 0.55, r * 0.18)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    if (isDead) {
      this._drawDeadEyes(ctx, r)
    } else {
      this._drawAliveEyes(ctx, r)
    }

    ctx.restore()
  }

  _drawWing(ctx, r, flap) {
    const wingY = r * 0.05
    const wingX = -r * 0.25
    const phase = flap > 0 ? flap : 0.15 + 0.15 * Math.sin(this.elapsed * 7)
    const angle = -Math.PI * 0.18 + phase * Math.PI * 0.55
    ctx.save()
    ctx.translate(wingX, wingY)
    ctx.rotate(angle)
    const wingGrad = ctx.createLinearGradient(0, 0, -r * 0.9, r * 0.3)
    wingGrad.addColorStop(0, this.blobGrad[1])
    wingGrad.addColorStop(1, this.blobGrad[2])
    ctx.fillStyle = wingGrad
    ctx.strokeStyle = this.blobGrad[2]
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(-r * 0.45, 0, r * 0.55, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  _drawAliveEyes(ctx, r) {
    const OUTLINE = '#1F2937'
    const blob = this.blob
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const eyeRx = r * 0.26
    const eyeRy = r * 0.31
    const hlR = r * 0.07
    const lookY = clamp(blob.vy / 400, -0.6, 0.8)
    const lookYOff = lookY * 2

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing
      ctx.fillStyle = OUTLINE
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + eyeRx * 0.32, eyeY + lookYOff - eyeRy * 0.33, hlR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(ex - eyeRx * 0.27, eyeY + lookYOff + eyeRy * 0.37, hlR * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Smile
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = Math.max(2, r * 0.054)
    ctx.lineCap = 'round'
    ctx.beginPath()
    const mouthW = r * 0.21
    const mouthY = r * 0.05
    ctx.moveTo(-mouthW, mouthY)
    ctx.quadraticCurveTo(0, mouthY + r * 0.11, mouthW, mouthY)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  _drawDeadEyes(ctx, r) {
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const s = r * 0.18
    ctx.strokeStyle = '#0f0c2e'
    ctx.lineWidth = Math.max(2, r * 0.054)
    ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing
      ctx.beginPath()
      ctx.moveTo(ex - s, eyeY - s)
      ctx.lineTo(ex + s, eyeY + s)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ex + s, eyeY - s)
      ctx.lineTo(ex - s, eyeY + s)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(0, r * 0.15, r * 0.21, Math.PI * 0.15, Math.PI * 0.85, true)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  _renderDeathFrame() {
    this.render()
    this._drawBlob(this.ctx, this.blob.x, this.blob.y, true)
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.input?.destroy()
  }
}
