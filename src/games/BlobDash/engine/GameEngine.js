// Blob Dash engine — scorrimento orizzontale stile Geometry Dash, tema paper/notebook.
// Phase 1: scroll + jump + spike. Block/pit/jump_pad arrivano nelle fasi successive.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  BLOB_X,
  PHYSICS,
} from './physics'
import { createRNG } from './rng'
import { generateObstacles, extendObstacles } from './levelGenerator'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

const PAPER_BG = '#F8F6F0'
const PAPER_LINE = 'rgba(155,148,135,0.18)'
const PAPER_MARGIN = 'rgba(210,70,70,0.09)'
const GROUND_INK = '#141414'
const OBSTACLE_INK = '#141414'
const OBSTACLE_STROKE = '#000000'

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
    this.obstacles = generateObstacles(this.rng, 80)

    // Blob: x è in world-space, ma poiché il blob è ancorato a BLOB_X sullo
    // schermo, lo aggiorniamo virtualmente sommando lo scroll. Per le collisioni
    // usiamo (cameraX + BLOB_X) come "world x" del blob.
    this.blob = {
      y: GROUND_Y - PHYSICS.BLOB_RADIUS,
      vy: 0,
      onGround: true,
      // "floor" è la y su cui il blob sta poggiando ora (può essere GROUND_Y
      // oppure il top di un block). Aggiornato in update().
      floorY: GROUND_Y,
    }

    // Camera scrolla a destra: cameraX cresce.
    this.cameraX = 0
    this.scrollSpeed = PHYSICS.SCROLL_SPEED_START

    this.distance = 0  // metri percorsi
    this.score = 0
    this.lastMilestone = 0
    this.milestoneFlash = 0

    this.isDead = false
    this.deathScore = 0
    this.rafId = null
    this.lastTime = 0
    this.elapsed = 0
    this.input = null

    // Squash/stretch
    this.squash = 1
    this.squashTimer = 0

    // Visible window start index (per skip degli ostacoli già passati)
    this.visibleStartIdx = 0

    // Particles + shake
    this.landingParticles = []
    this.breakParticles = []
    this.trailParticles = []
    this._trailSpawnAccum = 0
    this.padFlash = {} // idx pad → fade timer (0..1)
    this.screenShake = 0

    // Milestone badge
    this.milestoneBadge = null // { score, t } dove t va da 0 a 1.5s

    // Stop guard contro race con start()
    this._stopped = false
  }

  async start() {
    this.input = new InputManager(this.canvas)
    await this.input.init()
    if (this._stopped || this.isDead) {
      this.input?.destroy()
      return
    }
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
    const blob = this.blob

    // Consuma jump input (edge-triggered) solo se on-ground.
    if (this.input.consumeJump() && blob.onGround) {
      blob.vy = PHYSICS.JUMP_VELOCITY
      blob.onGround = false
      this.squash = 0.7
      this.squashTimer = 0.12
    }

    // Gravità + sposta blob.
    blob.vy += PHYSICS.GRAVITY * dt
    if (blob.vy > PHYSICS.MAX_FALL_SPEED) blob.vy = PHYSICS.MAX_FALL_SPEED
    const prevY = blob.y
    blob.y += blob.vy * dt

    // Scroll della camera (deve avvenire PRIMA dei check ostacolo per coerenza).
    this.cameraX += this.scrollSpeed * dt
    const blobWorldX = this.cameraX + BLOB_X

    // Front collision con block: se sto andando "dentro" il lato sinistro
    // di un block (non sopra), muoio.
    if (this._checkBlockFrontHit(blobWorldX)) {
      this.die()
      return
    }

    // Floor sotto il blob (ground / block top / +Infinity dentro pit).
    const floorY = this._computeFloorY(blobWorldX)
    blob.floorY = floorY
    const floorLine = floorY - PHYSICS.BLOB_RADIUS

    if (blob.vy >= 0 && prevY <= floorLine + 1 && blob.y >= floorLine) {
      // Atterraggio (ground o block top).
      blob.y = floorLine
      blob.vy = 0
      if (!blob.onGround) {
        this.squash = 0.7
        this.squashTimer = 0.10
        this._spawnLandingParticles(BLOB_X, floorY, 5)
      }
      blob.onGround = true
    } else if (Number.isFinite(floorY) && blob.y < floorLine) {
      blob.onGround = false
    } else {
      // Sopra un pit, oppure in aria.
      blob.onGround = false
    }

    // Death: caduta oltre il bottom (pit fail).
    if (blob.y > GAME_HEIGHT + 60) {
      this.die()
      return
    }

    // Jump pad: se il blob ci sta sopra (o lo attraversa cadendo), boost up.
    this._checkPadTrigger(blobWorldX)

    // Trail spawn (mentre il blob corre o salta).
    if (!this.isDead) {
      this._trailSpawnAccum += dt
      const interval = blob.onGround ? 0.05 : 0.03
      while (this._trailSpawnAccum >= interval) {
        this._trailSpawnAccum -= interval
        this._spawnTrailParticle()
      }
    }

    // Milestone badge timer.
    if (this.milestoneBadge) {
      this.milestoneBadge.t -= dt
      if (this.milestoneBadge.t <= 0) this.milestoneBadge = null
    }

    // Update particles + screen shake
    this._updateParticles(dt)
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.02, dt)
      if (this.screenShake < 0.3) this.screenShake = 0
    }
    // Pad flash decay
    for (const k of Object.keys(this.padFlash)) {
      this.padFlash[k] -= dt * 2
      if (this.padFlash[k] <= 0) delete this.padFlash[k]
    }

    // Squash recovery
    if (this.squashTimer > 0) {
      this.squashTimer -= dt
      if (this.squashTimer <= 0) this.squash = 1
    }

    // Distance (metri)
    const newDistance = (this.cameraX) / PHYSICS.PIXELS_PER_METER
    if (newDistance > this.distance) {
      this.distance = newDistance
      const newScore = Math.floor(this.distance)
      if (newScore > this.score) {
        this.score = newScore
        this.onScoreUpdate?.(this.score)
        const milestone = Math.floor(this.score / 50)
        if (milestone > this.lastMilestone) {
          this.lastMilestone = milestone
          this.milestoneFlash = 1
          this.milestoneBadge = { score: milestone * 50, t: 1.4 }
        }
      }
    }

    // Ramp scroll speed con la distanza
    const ramped = PHYSICS.SCROLL_SPEED_START + this.distance * PHYSICS.SCROLL_SPEED_RAMP_PER_METER
    this.scrollSpeed = Math.min(PHYSICS.SCROLL_SPEED_MAX, ramped)

    // Extend obstacles se la camera si avvicina alla fine
    const lastObs = this.obstacles[this.obstacles.length - 1]
    if (lastObs && lastObs.x - this.cameraX < GAME_WIDTH * 4) {
      extendObstacles(this.rng, this.obstacles, 80)
    }

    // Advance visibleStartIdx: skip ostacoli già passati a sinistra del viewport.
    while (this.visibleStartIdx < this.obstacles.length - 1) {
      const o = this.obstacles[this.visibleStartIdx]
      if (o.x + o.w - this.cameraX > -50) break
      this.visibleStartIdx++
    }

    // Spike collisions (block-front e pit gestiti negli helper sopra).
    const shrink = PHYSICS.HITBOX_SHRINK
    const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * shrink
    const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * shrink
    const blobTop = blob.y - PHYSICS.BLOB_RADIUS * shrink
    const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * shrink

    for (let i = this.visibleStartIdx; i < this.obstacles.length; i++) {
      const o = this.obstacles[i]
      const screenX = o.x - this.cameraX
      if (screenX > GAME_WIDTH + 50) break
      if (o.type !== 'spike') continue

      // Triangle hitbox approssimata: AABB centrata sulla metà superiore del
      // triangolo (il vertice è il punto cattivo, la base è sicura).
      const spikeLeft = o.x + o.w * 0.18
      const spikeRight = o.x + o.w * 0.82
      const spikeTop = o.y - o.h
      const spikeBottom = o.y - o.h * 0.10
      const hits =
        blobRight >= spikeLeft &&
        blobLeft <= spikeRight &&
        blobBottom >= spikeTop &&
        blobTop <= spikeBottom
      if (hits) {
        this.die()
        return
      }
    }
  }

  // ── COLLISION HELPERS ──────────────────────────────────────

  /**
   * Calcola la y del "pavimento" sotto la colonna del blob.
   * - Se sotto c'è un pit (gap nel ground) ritorna +Infinity (cadi).
   * - Se sopra un block, ritorna il top del block.
   * - Altrimenti ritorna GROUND_Y.
   */
  _computeFloorY(blobWorldX) {
    let floorY = GROUND_Y
    let onPit = false

    for (let i = this.visibleStartIdx; i < this.obstacles.length; i++) {
      const o = this.obstacles[i]
      if (o.x > blobWorldX + 5) break  // ordinati per x crescente
      if (o.x + o.w < blobWorldX - 5) continue

      if (o.type === 'pit') {
        // Considera "dentro al pit" se il centro del blob è sopra il pit footprint.
        if (blobWorldX >= o.x && blobWorldX <= o.x + o.w) {
          onPit = true
        }
      } else if (o.type === 'block') {
        // Sopra il block se la colonna del blob attraversa il block in x.
        if (blobWorldX >= o.x && blobWorldX <= o.x + o.w) {
          // Il top del block è una candidata floor, prendi la più alta (y minore).
          if (o.y < floorY) floorY = o.y
        }
      }
    }

    if (onPit && floorY === GROUND_Y) return Infinity
    return floorY
  }

  /**
   * Check del lato sinistro (front) di un block: se il blob sta arrivando in
   * orizzontale e il bottom è ben sotto il top del block, ha sbattuto contro
   * il muro frontale → morte.
   */
  _checkBlockFrontHit(blobWorldX) {
    const blob = this.blob
    const shrink = PHYSICS.HITBOX_SHRINK
    const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * shrink
    const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * shrink
    const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * shrink
    // Tolerance: se il blob bottom è entro questa distanza dal top del block,
    // consideralo "atterraggio" e non "muro" (lascia che _computeFloorY lo agganci).
    const LAND_TOL = 14

    for (let i = this.visibleStartIdx; i < this.obstacles.length; i++) {
      const o = this.obstacles[i]
      if (o.x - blobWorldX > 80) break
      if (o.type !== 'block') continue

      const blockTop = o.y
      const blockBottom = o.y + o.h
      const overlapX = blobRight >= o.x && blobLeft <= o.x + o.w
      if (!overlapX) continue

      // Se il bottom del blob è chiaramente sotto il top del block, sei dentro il muro.
      if (blobBottom > blockTop + LAND_TOL && blob.y < blockBottom) {
        return true
      }
    }
    return false
  }

  _checkPadTrigger(blobWorldX) {
    const blob = this.blob
    const shrink = PHYSICS.HITBOX_SHRINK
    const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * shrink
    const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * shrink
    const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * shrink

    for (let i = this.visibleStartIdx; i < this.obstacles.length; i++) {
      const o = this.obstacles[i]
      if (o.x > blobWorldX + 80) break
      if (o.type !== 'pad' || o.triggered) continue

      const padTop = o.y - o.h
      const overlapX = blobRight >= o.x && blobLeft <= o.x + o.w
      // Triggera se attraversiamo il top del pad mentre scendiamo (o gli passiamo sopra).
      if (overlapX && blobBottom >= padTop - 4 && blob.vy >= 0) {
        o.triggered = true
        blob.vy = PHYSICS.PAD_VELOCITY
        blob.onGround = false
        this.squash = 0.5
        this.squashTimer = 0.15
        this.padFlash[i] = 1
        this.screenShake = 5
        this._spawnLandingParticles(o.x + o.w / 2, padTop, 8)
        break
      }
    }
  }

  // ── PARTICLES ──────────────────────────────────────────────

  _spawnTrailParticle() {
    const blob = this.blob
    this.trailParticles.push({
      x: BLOB_X - PHYSICS.BLOB_RADIUS * 0.6 + (Math.random() - 0.5) * 4,
      y: blob.y + (Math.random() - 0.5) * PHYSICS.BLOB_RADIUS * 0.6,
      size: 2.4 + Math.random() * 2.4,
      alpha: 0.45,
      life: 0.35 + Math.random() * 0.15,
      color: this.blobGrad[1],
    })
  }

  _spawnLandingParticles(x, floorY, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8
      const speed = 60 + Math.random() * 140
      this.landingParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: floorY,
        vx: Math.cos(angle) * speed - this.scrollSpeed * 0.3, // bias contro lo scroll
        vy: Math.sin(angle) * speed - 40,
        life: 0.28 + Math.random() * 0.28,
        size: 2 + Math.random() * 3,
        color: '#141414',
      })
    }
  }

  _spawnBreakParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.breakParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 320,
        vy: -Math.random() * 240 - 60,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 14,
        life: 0.55 + Math.random() * 0.55,
        color,
      })
    }
  }

  _updateParticles(dt) {
    // Trail: scivola verso sinistra come tutto il mondo (relativo allo scroll),
    // oltre a fade out. Lo facciamo "scrollare" trasformando le x in world-space.
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i]
      p.x -= this.scrollSpeed * dt
      p.life -= dt
      p.alpha *= 0.93
      p.size *= 0.97
      if (p.life <= 0 || p.alpha < 0.02 || p.size < 0.4) this.trailParticles.splice(i, 1)
    }
    for (let i = this.landingParticles.length - 1; i >= 0; i--) {
      const p = this.landingParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 380 * dt
      p.life -= dt
      if (p.life <= 0) this.landingParticles.splice(i, 1)
    }
    for (let i = this.breakParticles.length - 1; i >= 0; i--) {
      const p = this.breakParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 700 * dt
      p.rotation += p.rotSpeed * dt
      p.life -= dt
      if (p.life <= 0) this.breakParticles.splice(i, 1)
    }
  }

  die() {
    if (this.isDead) return
    this.isDead = true
    this.deathScore = this.score
    this.screenShake = 12
    this._spawnBreakParticles(BLOB_X, this.blob.y, this.blobGrad[1], 16)
    this._renderDeathFrame()
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.input?.destroy()
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

    ctx.clearRect(-20, -20, GAME_WIDTH + 40, GAME_HEIGHT + 40)

    this._drawBackground(ctx)
    this._drawGround(ctx)
    this._drawObstacles(ctx)
    this._drawParticles(ctx)

    if (!this.isDead) {
      this._drawBlob(ctx, BLOB_X, this.blob.y, false)
    }

    if (this.milestoneFlash > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.milestoneFlash * 0.07})`
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      this.milestoneFlash -= 0.05
      if (this.milestoneFlash < 0) this.milestoneFlash = 0
    }

    if (this.milestoneBadge) this._drawMilestoneBadge(ctx)

    ctx.restore()
  }

  _drawMilestoneBadge(ctx) {
    const b = this.milestoneBadge
    const total = 1.4
    const lifeRatio = b.t / total           // 1 → 0
    const enter = Math.min(1, (total - b.t) / 0.18) // 0 → 1 nei primi 180ms
    const exit = Math.min(1, b.t / 0.4)             // 0 → 1 negli ultimi 400ms (fade out)
    const alpha = Math.min(enter, exit)
    const scale = 0.8 + 0.2 * enter
    const lift = (1 - exit) * 12

    ctx.save()
    ctx.translate(GAME_WIDTH / 2, 96 - lift)
    ctx.scale(scale, scale)
    ctx.globalAlpha = alpha

    const label = `${b.score} m`
    ctx.font = "900 32px 'Baloo 2', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Background pill
    const m = ctx.measureText(label)
    const padX = 18
    const w = m.width + padX * 2
    const h = 44
    ctx.fillStyle = '#141414'
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2)
    ctx.fill()

    // Text
    ctx.fillStyle = this.blobGrad[0]
    ctx.fillText(label, 0, 1)

    ctx.globalAlpha = 1
    ctx.restore()

    // mark as consumed lifecycle handled in update()
    void lifeRatio
  }

  _drawParticles(ctx) {
    for (const p of this.trailParticles) {
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    for (const p of this.landingParticles) {
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const p of this.breakParticles) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = Math.max(0, p.life * 1.8)
      ctx.fillStyle = p.color
      const hs = p.size / 2
      ctx.fillRect(-hs, -hs, p.size, p.size)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  _drawBackground(ctx) {
    // Carta beige
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Righe orizzontali del notebook (FISSE, non scrollano con la camera).
    const lineSpacing = 30
    ctx.strokeStyle = PAPER_LINE
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let ly = 30; ly <= GAME_HEIGHT; ly += lineSpacing) {
      ctx.moveTo(0, ly)
      ctx.lineTo(GAME_WIDTH, ly)
    }
    ctx.stroke()

    // Parallax background: tratti verticali leggeri che scorrono lenti dietro
    // al notebook, simulano "appunti veloci" sul retro del foglio. Solo nella
    // metà superiore così non disturbano la lettura degli ostacoli.
    const parallaxOffset = (this.cameraX * 0.15) % 80
    ctx.strokeStyle = 'rgba(155,148,135,0.10)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let bx = -parallaxOffset; bx < GAME_WIDTH + 80; bx += 80) {
      const wave = Math.sin((bx + this.cameraX * 0.15) * 0.04) * 12
      ctx.moveTo(bx, 40 + wave)
      ctx.lineTo(bx + 18, 110 + wave * 0.5)
      ctx.moveTo(bx + 40, 60 + wave * 0.7)
      ctx.lineTo(bx + 52, 130 + wave * 0.3)
    }
    ctx.stroke()

    // Margine rosso verticale a sinistra
    ctx.strokeStyle = PAPER_MARGIN
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(30, GAME_HEIGHT)
    ctx.stroke()
  }

  _drawGround(ctx) {
    // Linea principale del pavimento — disegnata "a penna" sopra il foglio.
    ctx.strokeStyle = GROUND_INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(GAME_WIDTH, GROUND_Y)
    ctx.stroke()

    // Hatching/tratteggio sotto la linea (effetto terreno schizzato).
    // Scorre con la camera per dare senso di movimento.
    ctx.strokeStyle = 'rgba(20,20,20,0.45)'
    ctx.lineWidth = 1.2
    const hatchSpacing = 18
    const hatchOffset = (-this.cameraX % hatchSpacing + hatchSpacing) % hatchSpacing
    ctx.beginPath()
    for (let hx = -hatchOffset; hx <= GAME_WIDTH + hatchSpacing; hx += hatchSpacing) {
      ctx.moveTo(hx, GROUND_Y + 4)
      ctx.lineTo(hx + 8, GROUND_Y + 20)
    }
    ctx.stroke()
  }

  _drawObstacles(ctx) {
    for (let i = this.visibleStartIdx; i < this.obstacles.length; i++) {
      const o = this.obstacles[i]
      const screenX = o.x - this.cameraX
      if (screenX > GAME_WIDTH + 50) break
      if (screenX + o.w < -50) continue

      if (o.type === 'spike') this._drawSpike(ctx, screenX, o)
      else if (o.type === 'block') this._drawBlock(ctx, screenX, o)
      else if (o.type === 'pit') this._drawPit(ctx, screenX, o)
      else if (o.type === 'pad') this._drawPad(ctx, screenX, o, i)
    }
  }

  _drawPad(ctx, sx, o, idx) {
    const baseY = o.y
    const topY = o.y - o.h
    const flash = this.padFlash[idx] || 0

    // Glow giallo quando triggerato.
    if (flash > 0) {
      const glowR = 60 * flash
      const grad = ctx.createRadialGradient(sx + o.w / 2, topY, 4, sx + o.w / 2, topY, glowR)
      grad.addColorStop(0, `rgba(251, 191, 36, ${0.45 * flash})`)
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(sx + o.w / 2, topY, glowR, 0, Math.PI * 2)
      ctx.fill()
    }

    // Ombra
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.beginPath()
    ctx.ellipse(sx + o.w / 2, baseY + 3, o.w * 0.48, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Corpo pad: ramp gialla con bordo ink
    const grad = ctx.createLinearGradient(0, topY, 0, baseY)
    grad.addColorStop(0, '#FCD34D')
    grad.addColorStop(1, '#F59E0B')
    ctx.fillStyle = grad
    ctx.strokeStyle = OBSTACLE_STROKE
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.roundRect(sx, topY, o.w, o.h, [6, 6, 2, 2])
    ctx.fill()
    ctx.stroke()

    // Freccia su (hint visivo)
    ctx.fillStyle = '#0f0c2e'
    const ax = sx + o.w / 2
    const ay = topY + o.h / 2
    ctx.beginPath()
    ctx.moveTo(ax, ay - 4)
    ctx.lineTo(ax - 5, ay + 2)
    ctx.lineTo(ax - 2, ay + 2)
    ctx.lineTo(ax - 2, ay + 5)
    ctx.lineTo(ax + 2, ay + 5)
    ctx.lineTo(ax + 2, ay + 2)
    ctx.lineTo(ax + 5, ay + 2)
    ctx.closePath()
    ctx.fill()
  }

  _drawBlock(ctx, sx, o) {
    // Ombra a terra
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.beginPath()
    ctx.ellipse(sx + o.w / 2, GROUND_Y + 3, o.w * 0.48, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Corpo del block: rettangolo arrotondato pen-ink
    ctx.fillStyle = OBSTACLE_INK
    ctx.strokeStyle = OBSTACLE_STROKE
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.roundRect(sx, o.y, o.w, o.h, 4)
    ctx.fill()
    ctx.stroke()

    // Edge highlight bianco sul top (sketch)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sx + 4, o.y + 1.5)
    ctx.lineTo(sx + o.w - 4, o.y + 1.5)
    ctx.stroke()
  }

  _drawPit(ctx, sx, o) {
    // Strappo del foglio: maschera il ground con il colore della pagina e disegna
    // una linea frastagliata ai due bordi (effetto "buco strappato").
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(sx, GROUND_Y - 1, o.w, 50)

    // Bordo seghettato superiore (sketch)
    ctx.strokeStyle = GROUND_INK
    ctx.lineWidth = 1.4
    ctx.beginPath()
    const teeth = Math.max(3, Math.floor(o.w / 10))
    const step = o.w / teeth
    ctx.moveTo(sx, GROUND_Y)
    for (let t = 0; t < teeth; t++) {
      const x1 = sx + t * step + step * 0.5
      const y1 = GROUND_Y + 4
      const x2 = sx + (t + 1) * step
      ctx.lineTo(x1, y1)
      ctx.lineTo(x2, GROUND_Y)
    }
    ctx.stroke()

    // Ombra interna del pit per profondità
    const pitGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 30)
    pitGrad.addColorStop(0, 'rgba(0,0,0,0.18)')
    pitGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = pitGrad
    ctx.fillRect(sx, GROUND_Y, o.w, 30)
  }

  _drawSpike(ctx, sx, o) {
    const baseY = o.y
    const topY = o.y - o.h
    const leftX = sx
    const rightX = sx + o.w
    const midX = sx + o.w / 2

    // Ombra soft sotto lo spike (sul ground), così stacca dal foglio.
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.ellipse(midX, baseY + 3, o.w * 0.45, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Triangolo pieno con bordo marcato (pen ink style)
    ctx.fillStyle = OBSTACLE_INK
    ctx.strokeStyle = OBSTACLE_STROKE
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(leftX, baseY)
    ctx.lineTo(midX, topY)
    ctx.lineTo(rightX, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Highlight white-thin sul lato sinistro (sketch shading)
    ctx.strokeStyle = 'rgba(255,255,255,0.20)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(leftX + 2, baseY - 2)
    ctx.lineTo(midX - 1, topY + 4)
    ctx.stroke()
  }

  // ── BLOB ──────────────────────────────────────────────

  _drawBlob(ctx, x, y, isDead) {
    const blob = this.blob
    const r = PHYSICS.BLOB_RADIUS

    let scaleX = 1, scaleY = 1
    if (!isDead) {
      if (this.squashTimer > 0) {
        scaleX = 1 + (1 - this.squash) * 0.5
        scaleY = this.squash
      } else if (blob.vy < -200) {
        const t = Math.min(1, Math.abs(blob.vy) / 800)
        scaleY = 1 + t * 0.22
        scaleX = 1 - t * 0.14
      } else if (blob.vy > 200) {
        const t = Math.min(1, blob.vy / 600)
        scaleY = 1 - t * 0.1
        scaleX = 1 + t * 0.07
      }
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scaleX, scaleY)

    // Body con radial gradient (palette canonical del blob)
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
    const glowGrad = ctx.createRadialGradient(-3, -4, 0, 0, 0, r)
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.25)')
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)')
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Top-left shine canonical
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

    if (isDead) this._drawDeadEyes(ctx, r)
    else this._drawAliveEyes(ctx, r)

    ctx.restore()
  }

  _drawAliveEyes(ctx, r) {
    const OUTLINE = '#1F2937'
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const eyeRx = r * 0.26
    const eyeRy = r * 0.31
    const hlR = r * 0.07
    // Determined gaze: occhi guardano avanti (verso destra) durante il dash.
    const lookOffX = eyeRx * 0.15
    const lookOffY = this.blob.vy < -200 ? -1.5 : this.blob.vy > 300 ? 1.5 : 0

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing

      ctx.fillStyle = OUTLINE
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + lookOffX + eyeRx * 0.32, eyeY + lookOffY - eyeRy * 0.33, hlR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(ex + lookOffX - eyeRx * 0.27, eyeY + lookOffY + eyeRy * 0.37, hlR * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Bocca neutra-determinata
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = Math.max(2, r * 0.054)
    ctx.lineCap = 'round'
    ctx.beginPath()
    const mouthW = r * 0.21
    const mouthY = r * 0.05
    ctx.moveTo(-mouthW, mouthY)
    ctx.quadraticCurveTo(0, mouthY + r * 0.09, mouthW, mouthY)
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
    this._drawBlob(this.ctx, BLOB_X, this.blob.y, true)
  }

  stop() {
    this._stopped = true
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.input?.destroy()
  }
}
