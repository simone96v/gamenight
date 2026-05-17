// Blob Dash — auto-runner ritmico stile Geometry Dash.
// Mondo che scorre a sinistra; blob fisso a x = BLOB_SCREEN_X.
// One-tap to jump. Ostacoli generati su griglia di beat seedable.

import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, BEAT } from './physics'
import { createRNG } from './rng'
import { generateObstacles } from './levelGenerator'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

const PAPER_BG = '#F8F6F0'
const PAPER_LINE = 'rgba(155,148,135,0.18)'
const PAPER_MARGIN = 'rgba(210,70,70,0.09)'

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function darkenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`
}

export class GameEngine {
  constructor(canvas, seed, blobColor, onScoreUpdate, onDeath) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.seed = seed | 0
    this.blobColor = blobColor || '#8B5CF6'
    this.onScoreUpdate = onScoreUpdate
    this.onDeath = onDeath

    const grad = BLOB_GRADIENTS[this.blobColor]
    this.blobGrad = grad || [this.blobColor, this.blobColor, this.blobColor]
    this.obstacleStyle = {
      fill: this.blobGrad[2],
      stroke: darkenHex(this.blobGrad[2], 35),
    }

    this.rng = createRNG(this.seed)

    this.worldX = 0
    this.runSpeed = PHYSICS.RUN_SPEED_BASE
    this.elapsed = 0
    this.score = 0

    this.blobY = PHYSICS.GROUND_Y - PHYSICS.BLOB_RADIUS
    this.blobVy = 0
    this.onGround = true
    this.lastGroundedAt = 0
    this.lastJumpRequestAt = -1

    this.obstacles = []
    this.lastGeneratedSlot = 0
    this._generateAhead()

    this.isDead = false
    this.deathScore = 0
    this.rafId = null
    this.lastTime = 0
    this.input = null

    this.squash = 1
    this.squashTimer = 0
    this.beatPulse = 0
    this.lastBeatSlot = -1
    this.screenShake = 0
    this.trailParticles = []
    this.deathParticles = []
  }

  _generateAhead() {
    const targetWorldX = this.worldX + GAME_WIDTH + 1500
    const targetSlot = Math.ceil((targetWorldX - BEAT.START_OFFSET) / BEAT.DIST)
    if (targetSlot > this.lastGeneratedSlot) {
      const newObs = generateObstacles(this.rng, this.lastGeneratedSlot, targetSlot)
      this.obstacles.push(...newObs)
      this.lastGeneratedSlot = targetSlot
    }
  }

  _pruneObstacles() {
    while (
      this.obstacles.length > 0 &&
      this.obstacles[0].worldX + this.obstacles[0].width < this.worldX - 50
    ) {
      this.obstacles.shift()
    }
  }

  async start() {
    this.input = new InputManager()
    this.input.init()
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

  update(dt) {
    // Ramp velocità di corsa: lineare da BASE a MAX in RUN_SPEED_RAMP_TIME secondi.
    const rampT = Math.min(1, this.elapsed / PHYSICS.RUN_SPEED_RAMP_TIME)
    this.runSpeed =
      PHYSICS.RUN_SPEED_BASE + (PHYSICS.RUN_SPEED_MAX - PHYSICS.RUN_SPEED_BASE) * rampT

    // Input salto con buffer + coyote time.
    if (this.input.consumeJump()) {
      this.lastJumpRequestAt = this.elapsed
    }
    const canJump =
      this.onGround || this.elapsed - this.lastGroundedAt < PHYSICS.COYOTE_TIME
    const recentRequest =
      this.elapsed - this.lastJumpRequestAt < PHYSICS.JUMP_BUFFER
    if (canJump && recentRequest && this.blobVy >= 0) {
      this.blobVy = PHYSICS.JUMP_VELOCITY
      this.onGround = false
      this.lastJumpRequestAt = -1
      this.squash = 0.7
      this.squashTimer = 0.12
    }

    // Avanzamento mondo + integrazione verticale.
    this.worldX += this.runSpeed * dt
    this.blobVy += PHYSICS.GRAVITY * dt
    this.blobY += this.blobVy * dt

    this._generateAhead()
    this._pruneObstacles()

    // Risoluzione collisioni in un singolo passaggio sugli ostacoli vicini.
    const blobWorldX = this.worldX + PHYSICS.BLOB_SCREEN_X
    const hitShrink = PHYSICS.BLOB_RADIUS * 0.3
    const blobHitLeft = blobWorldX - PHYSICS.BLOB_RADIUS + hitShrink
    const blobHitRight = blobWorldX + PHYSICS.BLOB_RADIUS - hitShrink

    let groundLevel = PHYSICS.GROUND_Y
    let killed = false

    for (const ob of this.obstacles) {
      if (ob.worldX + ob.width < blobWorldX - PHYSICS.BLOB_RADIUS) continue
      if (ob.worldX > blobWorldX + PHYSICS.BLOB_RADIUS) break

      const obLeft = ob.worldX
      const obRight = ob.worldX + ob.width
      if (!(blobHitRight > obLeft && blobHitLeft < obRight)) continue

      if (ob.type === 'spike' || ob.type === 'spike3') {
        // Hitbox accorciata al 75% superiore del triangolo per essere indulgente.
        const spikeTop = PHYSICS.GROUND_Y - ob.height
        const hitTop = spikeTop + ob.height * 0.25
        if (this.blobY + PHYSICS.BLOB_RADIUS * 0.7 > hitTop) {
          killed = true
          break
        }
      } else if (ob.type === 'block') {
        // Side-hit zone = 30% inferiore del block. Sopra è "sfiorabile" e il top
        // diventa una piattaforma su cui atterrare (snap nel ground-check sotto).
        // Questo rende possibile saltare al limite del bordo senza morire al
        // primo frame del salto (quando il blob non è ancora salito abbastanza).
        const blockTop = PHYSICS.GROUND_Y - ob.height
        const sideHitTop = blockTop + ob.height * 0.7
        const blobBottom = this.blobY + PHYSICS.BLOB_RADIUS
        if (blobBottom > sideHitTop) {
          killed = true
          break
        }
        if (blockTop < groundLevel) groundLevel = blockTop
      }
    }

    if (killed) {
      this.die()
      return
    }

    // Snap al terreno (o al top del block).
    if (this.blobVy >= 0 && this.blobY + PHYSICS.BLOB_RADIUS >= groundLevel) {
      const wasInAir = !this.onGround
      this.blobY = groundLevel - PHYSICS.BLOB_RADIUS
      this.blobVy = 0
      if (wasInAir) {
        this.squash = 0.78
        this.squashTimer = 0.10
        this.screenShake = 2
      }
      this.onGround = true
      this.lastGroundedAt = this.elapsed
    } else {
      this.onGround = false
    }

    // Recovery squash.
    if (this.squashTimer > 0) {
      this.squashTimer -= dt
      if (this.squashTimer <= 0) this.squash = 1
    }

    // Beat pulse visivo: scatta quando il blob entra in un nuovo slot di beat.
    const blobSlot = Math.floor((blobWorldX - BEAT.START_OFFSET) / BEAT.DIST)
    if (blobSlot > this.lastBeatSlot) {
      this.lastBeatSlot = blobSlot
      this.beatPulse = 1
    }
    if (this.beatPulse > 0) {
      this.beatPulse -= dt * 4
      if (this.beatPulse < 0) this.beatPulse = 0
    }

    // Trail particles mentre corre.
    if (this.onGround && Math.random() < 0.45) {
      this._spawnTrailParticle()
    }
    this._updateParticles(dt)

    // Decay screen shake.
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.001, dt)
      if (this.screenShake < 0.2) this.screenShake = 0
    }

    // Score = metri percorsi (worldX / pixels_per_meter).
    const newScore = Math.floor(this.worldX / PHYSICS.PIXELS_PER_METER)
    if (newScore > this.score) {
      this.score = newScore
      this.onScoreUpdate?.(this.score)
    }
  }

  // ── PARTICLES ──────────────────────────────────────────

  _spawnTrailParticle() {
    this.trailParticles.push({
      worldX: this.worldX + PHYSICS.BLOB_SCREEN_X - PHYSICS.BLOB_RADIUS * 0.6,
      y: this.blobY + PHYSICS.BLOB_RADIUS * 0.5,
      size: 2 + Math.random() * 2,
      alpha: 0.4,
      life: 0.35,
      color: this.blobGrad[1],
    })
  }

  _spawnDeathBurst() {
    const cx = PHYSICS.BLOB_SCREEN_X
    const cy = this.blobY
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const speed = 180 + Math.random() * 220
      this.deathParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        size: 3 + Math.random() * 4,
        life: 0.6 + Math.random() * 0.3,
        color: this.blobGrad[Math.floor(Math.random() * 3)],
      })
    }
  }

  _updateParticles(dt) {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const tp = this.trailParticles[i]
      tp.life -= dt
      tp.alpha *= 0.92
      tp.size *= 0.97
      if (tp.life <= 0 || tp.alpha < 0.02) this.trailParticles.splice(i, 1)
    }
    for (let i = this.deathParticles.length - 1; i >= 0; i--) {
      const dp = this.deathParticles[i]
      dp.x += dp.vx * dt
      dp.y += dp.vy * dt
      dp.vy += 600 * dt
      dp.life -= dt
      if (dp.life <= 0) this.deathParticles.splice(i, 1)
    }
  }

  die() {
    if (this.isDead) return
    this.isDead = true
    this.deathScore = this.score
    this.screenShake = 12
    this._spawnDeathBurst()
    this.render()
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
    this._drawGround(ctx)
    this._drawObstacles(ctx)
    this._drawTrailParticles(ctx)

    if (!this.isDead) {
      this._drawBlob(ctx, PHYSICS.BLOB_SCREEN_X, this.blobY)
    }

    this._drawDeathParticles(ctx)

    // Beat pulse — leggero scuro pulsante sopra a tutto.
    if (this.beatPulse > 0.05) {
      ctx.fillStyle = `rgba(0,0,0,${this.beatPulse * 0.06})`
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }

    ctx.restore()
  }

  _drawBackground(ctx) {
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Linee verticali che scorrono a sinistra con worldX.
    const lineSpacing = 30
    const lineOffset = ((this.worldX % lineSpacing) + lineSpacing) % lineSpacing
    ctx.strokeStyle = PAPER_LINE
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let lx = -lineOffset; lx <= GAME_WIDTH + lineSpacing; lx += lineSpacing) {
      ctx.moveTo(lx, 0)
      ctx.lineTo(lx, GAME_HEIGHT)
    }
    ctx.stroke()

    // Linea margine in alto (orizzontale fissa).
    ctx.strokeStyle = PAPER_MARGIN
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, 30)
    ctx.lineTo(GAME_WIDTH, 30)
    ctx.stroke()
  }

  _drawGround(ctx) {
    ctx.fillStyle = this.obstacleStyle.fill
    ctx.fillRect(0, PHYSICS.GROUND_Y, GAME_WIDTH, GAME_HEIGHT - PHYSICS.GROUND_Y)

    // Bordo top del terreno.
    ctx.strokeStyle = this.obstacleStyle.stroke
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, PHYSICS.GROUND_Y)
    ctx.lineTo(GAME_WIDTH, PHYSICS.GROUND_Y)
    ctx.stroke()

    // Highlight chiaro appena sotto il bordo.
    ctx.strokeStyle = 'rgba(255,255,255,0.20)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, PHYSICS.GROUND_Y + 2)
    ctx.lineTo(GAME_WIDTH, PHYSICS.GROUND_Y + 2)
    ctx.stroke()
  }

  _drawObstacles(ctx) {
    for (const ob of this.obstacles) {
      const screenX = ob.worldX - this.worldX
      if (screenX + ob.width < -10) continue
      if (screenX > GAME_WIDTH + 10) break

      if (ob.type === 'spike') this._drawSpike(ctx, screenX, ob.width, ob.height)
      else if (ob.type === 'spike3') this._drawSpike3(ctx, screenX, ob.width, ob.height)
      else if (ob.type === 'block') this._drawBlock(ctx, screenX, ob.width, ob.height)
    }
  }

  _drawSpike(ctx, x, w, h) {
    const top = PHYSICS.GROUND_Y - h
    ctx.fillStyle = this.obstacleStyle.fill
    ctx.beginPath()
    ctx.moveTo(x, PHYSICS.GROUND_Y)
    ctx.lineTo(x + w / 2, top)
    ctx.lineTo(x + w, PHYSICS.GROUND_Y)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = this.obstacleStyle.stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Lato sinistro illuminato.
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 2, PHYSICS.GROUND_Y - 2)
    ctx.lineTo(x + w / 2, top + 4)
    ctx.stroke()
  }

  _drawSpike3(ctx, x, w, h) {
    const spikeW = w / 3
    for (let i = 0; i < 3; i++) {
      this._drawSpike(ctx, x + i * spikeW, spikeW, h)
    }
  }

  _drawBlock(ctx, x, w, h) {
    const top = PHYSICS.GROUND_Y - h
    ctx.fillStyle = this.obstacleStyle.fill
    ctx.beginPath()
    ctx.roundRect(x, top, w, h, 4)
    ctx.fill()
    ctx.strokeStyle = this.obstacleStyle.stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Highlight superiore.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 4, top + 1)
    ctx.lineTo(x + w - 4, top + 1)
    ctx.stroke()
  }

  _drawTrailParticles(ctx) {
    for (const tp of this.trailParticles) {
      const sx = tp.worldX - this.worldX
      if (sx < -10 || sx > GAME_WIDTH + 10) continue
      ctx.fillStyle = tp.color
      ctx.globalAlpha = tp.alpha
      ctx.beginPath()
      ctx.arc(sx, tp.y, tp.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawDeathParticles(ctx) {
    for (const dp of this.deathParticles) {
      ctx.fillStyle = dp.color
      ctx.globalAlpha = Math.max(0, dp.life * 1.4)
      const hs = dp.size / 2
      ctx.fillRect(dp.x - hs, dp.y - hs, dp.size, dp.size)
    }
    ctx.globalAlpha = 1
  }

  // ── BLOB ───────────────────────────────────────────────

  _drawBlob(ctx, x, y) {
    const r = PHYSICS.BLOB_RADIUS

    // Squash/stretch + reazione alla velocità verticale.
    let scaleX = 1
    let scaleY = 1
    if (this.squashTimer > 0) {
      scaleX = 1 + (1 - this.squash) * 0.5
      scaleY = this.squash
    } else if (this.blobVy < -200) {
      const t = Math.min(1, Math.abs(this.blobVy) / 700)
      scaleY = 1 + t * 0.18
      scaleX = 1 - t * 0.10
    } else if (this.blobVy > 250) {
      const t = Math.min(1, this.blobVy / 600)
      scaleY = 1 - t * 0.10
      scaleX = 1 + t * 0.08
    }

    // Bob leggero a terra (camminata).
    const bobY = this.onGround ? Math.sin(this.elapsed * 18) * 1.2 : 0

    ctx.save()
    ctx.translate(x, y + bobY)
    ctx.scale(scaleX, scaleY)

    // Corpo.
    const [light, mid, dark] = this.blobGrad
    const bodyGrad = ctx.createRadialGradient(-4, -5, 1, 0, 2, r * 1.1)
    bodyGrad.addColorStop(0, light)
    bodyGrad.addColorStop(0.55, mid)
    bodyGrad.addColorStop(1, dark)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Glow interno.
    const glowGrad = ctx.createRadialGradient(-3, -4, 0, 0, 0, r)
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.25)')
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)')
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Shine top-left (canonical pose: vedi feedback_blob_poses).
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

    this._drawEyes(ctx, r)

    ctx.restore()
  }

  _drawEyes(ctx, r) {
    const OUTLINE = '#1F2937'
    // Proporzioni canonical (vedi feedback_blob_poses).
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const eyeRx = r * 0.26
    const eyeRy = r * 0.31
    const hlR = r * 0.07
    // Sguardo leggermente in avanti (a destra).
    const lookOff = eyeRx * 0.25
    const lookYOff = this.blobVy > 300 ? 1.5 : this.blobVy < -400 ? -1.5 : 0

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing

      ctx.fillStyle = OUTLINE
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + lookOff + eyeRx * 0.32, eyeY + lookYOff - eyeRy * 0.33, hlR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(ex + lookOff - eyeRx * 0.27, eyeY + lookYOff + eyeRy * 0.37, hlR * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Bocca (smile canonical).
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

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.input?.destroy()
  }
}
