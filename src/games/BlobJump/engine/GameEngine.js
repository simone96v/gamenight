import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, PLATFORM, lerp, isLanding } from './physics'
import { createRNG } from './rng'
import { generatePlatforms, extendPlatforms } from './platformGenerator'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

// Paper background constants
const PAPER_BG     = '#F8F6F0'
const PAPER_LINE   = 'rgba(155,148,135,0.18)'
const PAPER_MARGIN = 'rgba(210,70,70,0.09)'

// Default platform styles (overridden per-instance from blob color)
const DEFAULT_PLATFORM_STYLES = {
  normal:  { fill: '#141414', stroke: '#000000', glow: null },
  moving:  { fill: '#0891B2', stroke: '#075985', glow: 'rgba(8,145,178,0.45)' },
  fragile: { fill: '#EA580C', stroke: '#9A3412', glow: null },
  spring:  { fill: '#E11D48', stroke: '#9F1239', glow: 'rgba(225,29,72,0.4)' },
}

function darkenHex(hex, amount) {
  const rgb = hexToRgb(hex)
  return `rgb(${Math.max(0, rgb[0] - amount)},${Math.max(0, rgb[1] - amount)},${Math.max(0, rgb[2] - amount)})`
}

function hexWithAlpha(hex, alpha) {
  const rgb = hexToRgb(hex)
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}

function buildPlatformStyles(blobGrad) {
  const [light, mid, dark] = blobGrad
  return {
    normal:  { fill: dark, stroke: darkenHex(dark, 35), glow: null },
    moving:  { fill: '#6B7280', stroke: '#4B5563', glow: 'rgba(107,114,128,0.35)' },
    fragile: { fill: '#9CA3AF', stroke: '#6B7280', glow: null },
    spring:  { fill: '#D1D5DB', stroke: '#9CA3AF', glow: 'rgba(209,213,219,0.35)' },
  }
}

function lerpColor(colors, t) {
  const c = Math.max(0, Math.min(1, t))
  let i = 0
  while (i < colors.length - 1 && colors[i + 1].stop < c) i++
  if (i >= colors.length - 1) return colors[colors.length - 1].color
  const a = colors[i], b = colors[i + 1]
  const l = (c - a.stop) / (b.stop - a.stop)
  return [
    Math.round(lerp(a.color[0], b.color[0], l)),
    Math.round(lerp(a.color[1], b.color[1], l)),
    Math.round(lerp(a.color[2], b.color[2], l)),
  ]
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
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
    this.platformStyles = buildPlatformStyles(this.blobGrad)

    this.rng = createRNG(seed)
    this.platforms = generatePlatforms(this.rng, 200)

    const startPlatform = this.platforms[0]
    this.blob = {
      x: startPlatform.x + startPlatform.width / 2,
      y: startPlatform.y - PHYSICS.BLOB_RADIUS,
      vx: 0,
      vy: 0,
    }

    this.cameraY = 0
    this.maxHeight = 0
    this.score = 0
    this.lastMilestone = 0
    this.milestoneFlash = 0
    this.isDead = false
    this.deathScore = 0
    this.rafId = null
    this.lastTime = 0
    this.elapsed = 0
    this.input = null

    this.squash = 1
    this.squashTimer = 0
    this.lastLandedPlatform = null
    this.consecutiveBounces = 0

    // Fragile platform shake tracking
    this.fragileTimers = {} // idx → timer countdown

    // Trail particles (ascending fast)
    this.trailParticles = []
    this.breakParticles = []
    this.landingParticles = []

    this.springCompress = {}
    this.screenShake = 0

    // Danger zone warning (near bottom of camera)
    this.dangerAlpha = 0

    // Track the lowest index still relevant (platforms below camera are skipped)
    this.visibleStartIdx = 0
  }

  _generateBgParticles() {
    const rng = createRNG(this.seed + 777)
    const particles = []
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: rng() * GAME_WIDTH,
        baseY: rng() * 4000 - 2000,
        size: 2 + rng() * 4,
        alpha: 0.08 + rng() * 0.12,
        speed: 0.15 + rng() * 0.25,
      })
    }
    return particles
  }

  _generateStars() {
    const rng = createRNG(this.seed + 999)
    const stars = []
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: rng() * GAME_WIDTH,
        baseY: rng() * 5000 - 3000,
        size: 0.8 + rng() * 2,
        twinkleSpeed: 1 + rng() * 3,
        twinkleOffset: rng() * Math.PI * 2,
      })
    }
    return stars
  }

  _generateClouds() {
    const rng = createRNG(this.seed + 111)
    const clouds = []
    for (let i = 0; i < 14; i++) {
      const depth = 0.03 + rng() * 0.12 // parallax speed: slower = deeper
      clouds.push({
        x: rng() * GAME_WIDTH * 1.4 - GAME_WIDTH * 0.2,
        baseY: rng() * 6000 - 1000,
        width: 60 + rng() * 120,
        height: 20 + rng() * 35,
        depth,
        puffs: Math.floor(3 + rng() * 4), // number of circles making up the cloud
        puffOffsets: Array.from({ length: 7 }, () => ({
          dx: (rng() - 0.5) * 0.8,
          dy: (rng() - 0.5) * 0.5,
          r: 0.4 + rng() * 0.6,
        })),
        drift: (rng() - 0.5) * 8, // slow horizontal drift
      })
    }
    return clouds
  }

  _generateMountains() {
    const rng = createRNG(this.seed + 222)
    // Two mountain ridges at different parallax depths
    const ridges = []
    for (let layer = 0; layer < 2; layer++) {
      const depth = layer === 0 ? 0.04 : 0.08
      const peaks = []
      const peakCount = 6 + Math.floor(rng() * 3)
      for (let i = 0; i < peakCount; i++) {
        peaks.push({
          x: (i / (peakCount - 1)) * (GAME_WIDTH + 80) - 40,
          height: 40 + rng() * (layer === 0 ? 80 : 50),
          width: 60 + rng() * 80,
        })
      }
      ridges.push({ depth, peaks, baseY: 300 + layer * 100 })
    }
    return ridges
  }

  _generateFloatingIslands() {
    const rng = createRNG(this.seed + 333)
    const islands = []
    for (let i = 0; i < 8; i++) {
      islands.push({
        x: rng() * GAME_WIDTH,
        baseY: rng() * 8000 - 2000,
        width: 25 + rng() * 40,
        height: 10 + rng() * 15,
        depth: 0.06 + rng() * 0.08,
        hasTree: rng() > 0.4,
        treeHeight: 8 + rng() * 14,
        drift: (rng() - 0.5) * 4,
      })
    }
    return islands
  }

  _generateAurora() {
    const rng = createRNG(this.seed + 444)
    const bands = []
    for (let i = 0; i < 5; i++) {
      bands.push({
        x: rng() * GAME_WIDTH,
        baseY: rng() * 3000 - 1000,
        width: 100 + rng() * 200,
        amplitude: 15 + rng() * 30,
        frequency: 0.003 + rng() * 0.005,
        phase: rng() * Math.PI * 2,
        speed: 0.3 + rng() * 0.6,
        hue: 160 + rng() * 60, // green to cyan
        depth: 0.02 + rng() * 0.04,
      })
    }
    return bands
  }

  _generateMoon() {
    const rng = createRNG(this.seed + 555)
    return {
      x: 50 + rng() * (GAME_WIDTH - 100),
      baseY: rng() * 2000 - 500,
      radius: 28 + rng() * 16,
      depth: 0.02,
      craters: Array.from({ length: 4 }, () => ({
        dx: (rng() - 0.5) * 0.6,
        dy: (rng() - 0.5) * 0.6,
        r: 0.08 + rng() * 0.15,
      })),
    }
  }

  async start() {
    this.input = new InputManager(this.canvas)
    await this.input.init()
    // Guard contro race: se nel frattempo qualcuno ha già chiamato stop()
    // (es. componente unmountato prima che input.init resolvi) NON avviare
    // il loop, altrimenti restiamo con un engine zombie che gira a vuoto.
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

    // Update input smooth states
    this.input.update(dt)

    // Direction-based movement with acceleration + friction
    const dir = this.input.getDirection()
    const maxSpeed = PHYSICS.MOVE_SPEED
    const accel = PHYSICS.MOVE_ACCEL
    const friction = PHYSICS.MOVE_FRICTION

    if (Math.abs(dir) > 0.01) {
      const targetVx = dir * maxSpeed
      blob.vx += (targetVx - blob.vx) * Math.min(1, accel * dt)
    } else {
      blob.vx *= Math.pow(friction, dt * 60)
      if (Math.abs(blob.vx) < 2) blob.vx = 0
    }

    blob.vy += PHYSICS.GRAVITY * dt
    blob.y += blob.vy * dt
    blob.x += blob.vx * dt

    // Wrap around horizontally
    if (blob.x > GAME_WIDTH + PHYSICS.BLOB_RADIUS) blob.x = -PHYSICS.BLOB_RADIUS
    if (blob.x < -PHYSICS.BLOB_RADIUS) blob.x = GAME_WIDTH + PHYSICS.BLOB_RADIUS

    // ── Endless platform generation ──
    // When the blob approaches the highest generated platform, create more
    const lastPlatY = this.platforms[this.platforms.length - 1].y
    if (blob.y < lastPlatY + GAME_HEIGHT * 4) {
      extendPlatforms(this.rng, this.platforms, 200)
    }

    // Advance visibleStartIdx — skip platforms far below the camera
    while (this.visibleStartIdx < this.platforms.length - 1) {
      if (this.platforms[this.visibleStartIdx].y - this.cameraY <= GAME_HEIGHT + 200) break
      this.visibleStartIdx++
    }

    // Update moving platforms (only visible range)
    for (let i = this.visibleStartIdx; i < this.platforms.length; i++) {
      const p = this.platforms[i]
      if (p.y - this.cameraY < -100) break // above camera, rest are even higher
      if (p.type !== 'moving' || p.broken) continue
      p.x += p.movingDir * p.movingSpeed * dt
      if (p.x <= 0) { p.x = 0; p.movingDir = 1 }
      if (p.x + p.width >= GAME_WIDTH) { p.x = GAME_WIDTH - p.width; p.movingDir = -1 }
    }

    // Update fragile platform shake timers
    for (const key of Object.keys(this.fragileTimers)) {
      this.fragileTimers[key] -= dt
      if (this.fragileTimers[key] <= 0) {
        const idx = parseInt(key)
        const p = this.platforms[idx]
        if (p && !p.broken) {
          p.broken = true
          this._spawnBreakParticles(p)
        }
        delete this.fragileTimers[key]
      }
    }

    // Spring decompress
    for (const key of Object.keys(this.springCompress)) {
      this.springCompress[key] -= dt * 6
      if (this.springCompress[key] <= 0) delete this.springCompress[key]
    }

    // Collision — only when falling, scan visible range only
    if (blob.vy > 0) {
      // Swept collision: check from previous y to current y to prevent tunneling
      const prevBlobBottom = (blob.y - blob.vy * dt) + PHYSICS.BLOB_RADIUS
      const curBlobBottom = blob.y + PHYSICS.BLOB_RADIUS
      const sweepTop = Math.min(prevBlobBottom, curBlobBottom)
      const sweepBottom = Math.max(prevBlobBottom, curBlobBottom)

      for (let i = this.visibleStartIdx; i < this.platforms.length; i++) {
        const p = this.platforms[i]
        // Platforms are sorted by descending y (first = bottom, last = top).
        // Skip platforms above the camera with a generous margin.
        const screenY = p.y - this.cameraY
        if (screenY < -100) break // all remaining platforms are higher
        if (screenY > GAME_HEIGHT + 80) continue // below camera

        if (p.broken) continue

        // Swept landing check: did the blob bottom pass through the platform?
        const blobLeft = blob.x - PHYSICS.BLOB_RADIUS * 0.75
        const blobRight = blob.x + PHYSICS.BLOB_RADIUS * 0.75
        const hOverlap = blobRight >= p.x && blobLeft <= p.x + p.width
        const vOverlap = sweepBottom >= p.y && sweepTop <= p.y + PLATFORM.COLLISION_TOLERANCE

        if (hOverlap && vOverlap) {
          // Snap blob to platform surface
          blob.y = p.y - PHYSICS.BLOB_RADIUS
          this._handleLanding(i, p)
          break
        }
      }
    }

    // Squash/stretch recovery
    if (this.squashTimer > 0) {
      this.squashTimer -= dt
      if (this.squashTimer <= 0) this.squash = 1
    }

    // Update particles
    this._updateParticles(dt)

    // Spawn trail when ascending fast
    if (blob.vy < -350 && !this.isDead) {
      this._spawnTrailParticle()
    }

    // Camera — smooth follow upward with slight anticipation
    const anticipation = blob.vy < -200 ? blob.vy * 0.06 : 0
    const targetCameraY = blob.y - GAME_HEIGHT * 0.62 + anticipation
    if (targetCameraY < this.cameraY) {
      const smoothing = 1 - Math.pow(0.0001, dt)
      this.cameraY += (targetCameraY - this.cameraY) * smoothing
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.02, dt)
      if (this.screenShake < 0.3) this.screenShake = 0
    }

    // Milestone flash decay
    if (this.milestoneFlash > 0) {
      this.milestoneFlash -= dt * 3
      if (this.milestoneFlash < 0) this.milestoneFlash = 0
    }

    // Score & milestones
    const height = GAME_HEIGHT - 80 - blob.y
    if (height > this.maxHeight) {
      this.maxHeight = height
      const newScore = Math.floor(this.maxHeight / PHYSICS.PIXELS_PER_METER)
      if (newScore > this.score) {
        this.score = newScore
        this.onScoreUpdate?.(this.score)
        // Milestone every 50m
        const milestone = Math.floor(this.score / 50)
        if (milestone > this.lastMilestone) {
          this.lastMilestone = milestone
          this.milestoneFlash = 1
        }
      }
    }

    // Danger zone — blob near bottom of camera view
    const screenBottom = blob.y - this.cameraY
    const dangerThreshold = GAME_HEIGHT * 0.75
    if (screenBottom > dangerThreshold && blob.vy > 0) {
      this.dangerAlpha = lerp(0, 0.3, (screenBottom - dangerThreshold) / (GAME_HEIGHT * 0.25))
    } else {
      this.dangerAlpha *= 0.9
      if (this.dangerAlpha < 0.01) this.dangerAlpha = 0
    }

    // Death check
    if (blob.y - this.cameraY > GAME_HEIGHT + 60) {
      this.die()
    }
  }

  _handleLanding(idx, platform) {
    const blob = this.blob

    if (platform.type === 'spring') {
      blob.vy = PHYSICS.SPRING_VELOCITY
      this.squash = 0.5
      this.squashTimer = 0.15
      this.springCompress[idx] = 1
      this.screenShake = 4
      this.consecutiveBounces++
      this._spawnLandingParticles(blob.x, platform.y, 'spring', 8)
    } else if (platform.type === 'fragile') {
      blob.vy = PHYSICS.JUMP_VELOCITY
      this.squash = 0.7
      this.squashTimer = 0.12
      // Start shake timer — platform breaks after delay
      if (this.fragileTimers[idx] === undefined) {
        this.fragileTimers[idx] = PLATFORM.FRAGILE_BREAK_DELAY
      }
      this.consecutiveBounces++
      this._spawnLandingParticles(blob.x, platform.y, 'fragile', 5)
    } else {
      blob.vy = PHYSICS.JUMP_VELOCITY
      this.squash = 0.7
      this.squashTimer = 0.12
      this.consecutiveBounces++
      this._spawnLandingParticles(blob.x, platform.y, platform.type, 5)
    }

    // Momentum transfer from moving platforms
    if (platform.type === 'moving') {
      const boost = platform.movingDir * platform.movingSpeed * PHYSICS.MOVING_PLATFORM_BOOST
      blob.vx += boost
    }

    this.lastLandedPlatform = platform
  }

  // ── PARTICLES ──────────────────────────────────────────

  _updateParticles(dt) {
    for (let i = this.breakParticles.length - 1; i >= 0; i--) {
      const bp = this.breakParticles[i]
      bp.x += bp.vx * dt
      bp.y += bp.vy * dt
      bp.vy += 600 * dt
      bp.rotation += bp.rotSpeed * dt
      bp.life -= dt
      if (bp.life <= 0) this.breakParticles.splice(i, 1)
    }

    for (let i = this.landingParticles.length - 1; i >= 0; i--) {
      const lp = this.landingParticles[i]
      lp.x += lp.vx * dt
      lp.y += lp.vy * dt
      lp.vy += 300 * dt
      lp.life -= dt
      if (lp.life <= 0) this.landingParticles.splice(i, 1)
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const tp = this.trailParticles[i]
      tp.life -= dt
      tp.size *= 0.96
      tp.alpha *= 0.95
      if (tp.life <= 0 || tp.alpha < 0.01) this.trailParticles.splice(i, 1)
    }
  }

  _spawnTrailParticle() {
    const blob = this.blob
    this.trailParticles.push({
      x: blob.x + (Math.random() - 0.5) * PHYSICS.BLOB_RADIUS * 0.8,
      y: blob.y + PHYSICS.BLOB_RADIUS * 0.6,
      size: 2 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.2,
      life: 0.3 + Math.random() * 0.2,
      color: this.blobGrad[1],
    })
  }

  _spawnBreakParticles(platform) {
    const cx = platform.x + platform.width / 2
    const cy = platform.y
    for (let i = 0; i < 10; i++) {
      this.breakParticles.push({
        x: cx + (Math.random() - 0.5) * platform.width,
        y: cy + Math.random() * PLATFORM.HEIGHT,
        vx: (Math.random() - 0.5) * 300,
        vy: -Math.random() * 200 - 50,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        life: 0.5 + Math.random() * 0.5,
        color: this.platformStyles.fragile.fill,
      })
    }
  }

  _spawnLandingParticles(x, platformY, type, count) {
    const color = this.platformStyles[type]?.fill || this.platformStyles.normal.fill
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8
      const speed = 40 + Math.random() * 100
      this.landingParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: platformY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.25 + Math.random() * 0.25,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  die() {
    if (this.isDead) return  // idempotente: evita doppi onDeath()
    this.isDead = true
    this.deathScore = this.score
    this._renderDeathFrame()
    // Cancella il prossimo RAF e disabilita input subito: il blob non si
    // muove più anche se la fase React non è ancora cambiata.
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.input?.destroy()
    this.onDeath?.(this.score)
  }

  _isVisible(platform) {
    const screenY = platform.y - this.cameraY
    return screenY > -50 && screenY < GAME_HEIGHT + 50
  }

  // ── RENDER ──────────────────────────────────────────────

  render() {
    const ctx = this.ctx
    const cam = this.cameraY

    ctx.save()
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2
      const sy = (Math.random() - 0.5) * this.screenShake * 2
      ctx.translate(sx, sy)
    }

    ctx.clearRect(-5, -5, GAME_WIDTH + 10, GAME_HEIGHT + 10)

    // Paper background with ruled lines
    this._drawBackground(ctx)

    // Draw platforms (only visible range)
    for (let i = this.visibleStartIdx; i < this.platforms.length; i++) {
      const p = this.platforms[i]
      if (p.broken) continue
      const screenY = p.y - cam
      if (screenY < -30) break // rest are above camera
      if (screenY > GAME_HEIGHT + 30) continue
      this._drawPlatform(ctx, p, screenY, i)
    }

    this._drawParticles(ctx, cam)

    if (!this.isDead) {
      this._drawBlob(ctx, this.blob.x, this.blob.y - cam, false)
    }

    // Danger zone vignette
    if (this.dangerAlpha > 0) {
      this._drawDangerVignette(ctx)
    }

    // Milestone flash — subtle dark pulse on paper
    if (this.milestoneFlash > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.milestoneFlash * 0.07})`
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    }

    ctx.restore()
  }

  _drawBackground(ctx) {
    // Paper base
    ctx.fillStyle = PAPER_BG
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Horizontal ruled lines — fixed world positions, scroll with camera
    const lineSpacing = 30
    const lineOffset = ((this.cameraY % lineSpacing) + lineSpacing) % lineSpacing
    ctx.strokeStyle = PAPER_LINE
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let ly = -lineOffset; ly <= GAME_HEIGHT + lineSpacing; ly += lineSpacing) {
      ctx.moveTo(0, ly)
      ctx.lineTo(GAME_WIDTH, ly)
    }
    ctx.stroke()

    // Left margin line (notebook style)
    ctx.strokeStyle = PAPER_MARGIN
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(30, GAME_HEIGHT)
    ctx.stroke()
  }

  _drawBgParticles(ctx, cam, progress) {
    const alpha = Math.min(1, 0.3 + progress * 0.7)
    for (const p of this.bgParticles) {
      const screenY = (p.baseY - cam * p.speed) % (GAME_HEIGHT + 100)
      const y = screenY < -50 ? screenY + GAME_HEIGHT + 100 : screenY
      ctx.fillStyle = `rgba(255,255,255,${p.alpha * alpha})`
      ctx.beginPath()
      ctx.arc(p.x, y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawStars(ctx, cam, progress) {
    if (progress < 0.35) return
    const starAlpha = Math.min(1, (progress - 0.35) / 0.35)
    for (const s of this.stars) {
      const screenY = (s.baseY - cam * 0.05) % (GAME_HEIGHT + 200)
      const y = screenY < -100 ? screenY + GAME_HEIGHT + 200 : screenY
      const twinkle = 0.4 + 0.6 * Math.sin(this.elapsed * s.twinkleSpeed + s.twinkleOffset) ** 2
      ctx.fillStyle = `rgba(255,255,255,${starAlpha * 0.7 * twinkle})`
      ctx.beginPath()
      ctx.arc(s.x, y, s.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawClouds(ctx, cam, progress) {
    // Clouds fade out as sky darkens
    if (progress > 0.65) return
    const fadeAlpha = progress < 0.4 ? 1 : 1 - (progress - 0.4) / 0.25

    for (const c of this.clouds) {
      const screenY = (c.baseY - cam * c.depth) % (GAME_HEIGHT + 200)
      const y = screenY < -100 ? screenY + GAME_HEIGHT + 200 : screenY
      const x = c.x + Math.sin(this.elapsed * 0.15 + c.drift) * c.drift * 3

      const alpha = fadeAlpha * (0.12 + c.depth * 0.5)
      ctx.fillStyle = `rgba(255,255,255,${alpha})`

      // Draw cloud as overlapping ellipses
      for (let i = 0; i < c.puffs; i++) {
        const puff = c.puffOffsets[i]
        const px = x + puff.dx * c.width
        const py = y + puff.dy * c.height
        const rx = c.width * 0.35 * puff.r
        const ry = c.height * 0.5 * puff.r

        ctx.beginPath()
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  _drawMountains(ctx, cam, progress) {
    // Mountains visible in early game, fade to silhouettes
    if (progress > 0.55) return
    const fadeAlpha = progress < 0.35 ? 1 : 1 - (progress - 0.35) / 0.2

    for (const ridge of this.mountains) {
      const baseScreenY = GAME_HEIGHT - 30 + (ridge.baseY - cam * ridge.depth)
      // Wrap so mountains always feel present
      const wrapY = ((baseScreenY % (GAME_HEIGHT + 200)) + GAME_HEIGHT + 200) % (GAME_HEIGHT + 200)
      if (wrapY < -150 || wrapY > GAME_HEIGHT + 50) continue

      const layerAlpha = fadeAlpha * (ridge.depth < 0.06 ? 0.06 : 0.10)
      const color = progress < 0.25
        ? `rgba(139,92,246,${layerAlpha})`     // purple tint
        : `rgba(88,80,150,${layerAlpha * 1.5})` // darker purple

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(-10, wrapY + 50)

      for (const peak of ridge.peaks) {
        const px = peak.x
        const py = wrapY - peak.height
        // Smooth mountain shape using quadratic curves
        ctx.lineTo(px - peak.width * 0.5, wrapY)
        ctx.quadraticCurveTo(px, py, px + peak.width * 0.5, wrapY)
      }

      ctx.lineTo(GAME_WIDTH + 10, wrapY + 50)
      ctx.closePath()
      ctx.fill()
    }
  }

  _drawMoon(ctx, cam, progress) {
    // Moon appears in the mid-to-late game as sky darkens
    if (progress < 0.3) return
    const m = this.moon
    const fadeIn = Math.min(1, (progress - 0.3) / 0.2)

    const screenY = (m.baseY - cam * m.depth) % (GAME_HEIGHT + 400)
    const y = screenY < -200 ? screenY + GAME_HEIGHT + 400 : screenY
    const x = m.x

    // Outer glow
    const glowR = m.radius * 2.8
    const glow = ctx.createRadialGradient(x, y, m.radius * 0.5, x, y, glowR)
    glow.addColorStop(0, `rgba(219,234,254,${fadeIn * 0.12})`)
    glow.addColorStop(0.5, `rgba(165,180,252,${fadeIn * 0.06})`)
    glow.addColorStop(1, 'rgba(165,180,252,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, glowR, 0, Math.PI * 2)
    ctx.fill()

    // Moon body
    const bodyGrad = ctx.createRadialGradient(x - m.radius * 0.25, y - m.radius * 0.25, 0, x, y, m.radius)
    bodyGrad.addColorStop(0, `rgba(243,237,255,${fadeIn * 0.35})`)
    bodyGrad.addColorStop(0.7, `rgba(219,234,254,${fadeIn * 0.25})`)
    bodyGrad.addColorStop(1, `rgba(165,180,252,${fadeIn * 0.15})`)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(x, y, m.radius, 0, Math.PI * 2)
    ctx.fill()

    // Craters
    for (const cr of m.craters) {
      const cx = x + cr.dx * m.radius
      const cy = y + cr.dy * m.radius
      const crR = cr.r * m.radius
      ctx.fillStyle = `rgba(139,92,246,${fadeIn * 0.1})`
      ctx.beginPath()
      ctx.arc(cx, cy, crR, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawFloatingIslands(ctx, cam, progress) {
    // Small floating islands/rocks in the mid-game
    const fadeAlpha = progress < 0.15 ? progress / 0.15
      : progress > 0.7 ? Math.max(0, 1 - (progress - 0.7) / 0.2)
      : 1

    if (fadeAlpha <= 0) return

    for (const isl of this.floatingIslands) {
      const screenY = (isl.baseY - cam * isl.depth) % (GAME_HEIGHT + 300)
      const y = screenY < -150 ? screenY + GAME_HEIGHT + 300 : screenY
      if (y < -80 || y > GAME_HEIGHT + 80) continue

      const x = isl.x + Math.sin(this.elapsed * 0.4 + isl.drift * 2) * 6
      const bobY = y + Math.sin(this.elapsed * 0.8 + isl.baseY * 0.01) * 3
      const alpha = fadeAlpha * 0.15

      // Island body — rounded rock shape
      const grad = ctx.createLinearGradient(x, bobY - isl.height, x, bobY + isl.height * 0.5)
      grad.addColorStop(0, `rgba(139,92,246,${alpha})`)
      grad.addColorStop(1, `rgba(88,80,150,${alpha * 1.5})`)
      ctx.fillStyle = grad

      ctx.beginPath()
      ctx.ellipse(x, bobY, isl.width / 2, isl.height / 2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Flat top highlight
      ctx.fillStyle = `rgba(165,180,252,${alpha * 0.8})`
      ctx.beginPath()
      ctx.ellipse(x, bobY - isl.height * 0.15, isl.width * 0.4, isl.height * 0.2, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      // Tiny tree
      if (isl.hasTree) {
        const tx = x
        const ty = bobY - isl.height * 0.4
        // Trunk
        ctx.fillStyle = `rgba(120,80,60,${alpha})`
        ctx.fillRect(tx - 1.5, ty - isl.treeHeight, 3, isl.treeHeight)
        // Foliage
        ctx.fillStyle = `rgba(74,222,128,${alpha})`
        ctx.beginPath()
        ctx.arc(tx, ty - isl.treeHeight, isl.treeHeight * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  _drawAurora(ctx, cam, progress) {
    // Aurora visible only at extreme heights
    if (progress < 0.6) return
    const fadeIn = Math.min(1, (progress - 0.6) / 0.2)

    for (const band of this.aurora) {
      const baseY = (band.baseY - cam * band.depth) % (GAME_HEIGHT + 200)
      const y = baseY < -100 ? baseY + GAME_HEIGHT + 200 : baseY

      ctx.beginPath()
      ctx.moveTo(band.x - band.width / 2, y)

      // Wavy aurora band
      const steps = 20
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const px = band.x - band.width / 2 + t * band.width
        const wave = Math.sin(t * Math.PI * 4 + this.elapsed * band.speed + band.phase) * band.amplitude
        ctx.lineTo(px, y + wave)
      }

      // Close back along a slightly offset path
      for (let i = steps; i >= 0; i--) {
        const t = i / steps
        const px = band.x - band.width / 2 + t * band.width
        const wave = Math.sin(t * Math.PI * 4 + this.elapsed * band.speed + band.phase + 0.5) * band.amplitude * 0.6
        ctx.lineTo(px, y + wave + 15)
      }
      ctx.closePath()

      const alpha = fadeIn * 0.06
      ctx.fillStyle = `hsla(${band.hue},70%,65%,${alpha})`
      ctx.fill()
    }
  }

  _drawDangerVignette(ctx) {
    const a = this.dangerAlpha
    // Solo gradient dal basso: sale dal bordo inferiore con un alone rosso che
    // segnala l'area di morte. Niente glow laterali (sono fuorvianti perché i
    // bordi laterali non uccidono: il blob wrappa).
    const grad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.65, 0, GAME_HEIGHT)
    grad.addColorStop(0, 'rgba(220,38,38,0)')
    grad.addColorStop(1, `rgba(220,38,38,${a * 1.4})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, GAME_HEIGHT * 0.65, GAME_WIDTH, GAME_HEIGHT * 0.35)
  }

  _drawParticles(ctx, cam) {
    // Break particles
    for (const bp of this.breakParticles) {
      const sy = bp.y - cam
      ctx.save()
      ctx.translate(bp.x, sy)
      ctx.rotate(bp.rotation)
      ctx.globalAlpha = Math.max(0, bp.life * 2)
      ctx.fillStyle = bp.color
      const hs = bp.size / 2
      ctx.fillRect(-hs, -hs, bp.size, bp.size)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    // Landing particles
    for (const lp of this.landingParticles) {
      const sy = lp.y - cam
      const a = Math.max(0, lp.life * 4)
      ctx.fillStyle = lp.color
      ctx.globalAlpha = a * 0.7
      ctx.beginPath()
      ctx.arc(lp.x, sy, lp.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Trail particles
    for (const tp of this.trailParticles) {
      const sy = tp.y - cam
      ctx.fillStyle = tp.color
      ctx.globalAlpha = tp.alpha
      ctx.beginPath()
      ctx.arc(tp.x, sy, tp.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawPlatform(ctx, p, screenY, idx) {
    const style = this.platformStyles[p.type] || this.platformStyles.normal
    const r = PLATFORM.HEIGHT / 2
    const h = PLATFORM.HEIGHT

    // Fragile shake when about to break
    let shakeX = 0
    if (this.fragileTimers[idx] !== undefined) {
      const intensity = 1 - this.fragileTimers[idx] / PLATFORM.FRAGILE_BREAK_DELAY
      shakeX = Math.sin(this.elapsed * 80) * intensity * 4
    }

    ctx.save()
    if (shakeX) ctx.translate(shakeX, 0)

    // Glow for moving/spring
    if (style.glow) {
      ctx.shadowColor = style.glow
      ctx.shadowBlur = 10
    }

    // Top surface highlight gradient
    const surfGrad = ctx.createLinearGradient(p.x, screenY, p.x, screenY + h)
    surfGrad.addColorStop(0, this._lighten(style.fill, 30))
    surfGrad.addColorStop(0.5, style.fill)
    surfGrad.addColorStop(1, style.stroke)
    ctx.fillStyle = surfGrad

    ctx.beginPath()
    ctx.roundRect(p.x, screenY, p.width, h, r)
    ctx.fill()

    ctx.shadowBlur = 0

    // Top edge highlight — white shimmer on dark platform surfaces
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p.x + r, screenY + 1)
    ctx.lineTo(p.x + p.width - r, screenY + 1)
    ctx.stroke()

    // Spring coil with compression
    if (p.type === 'spring') {
      const compress = this.springCompress[idx] || 0
      const coilH = 12 * (1 - compress * 0.6)
      const cx = p.x + p.width / 2
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      const coilW = 7, coils = 3
      for (let j = 0; j <= coils * 2; j++) {
        const t = j / (coils * 2)
        const sx = cx + (j % 2 === 0 ? -coilW : coilW)
        const sy = screenY - 2 - t * coilH
        if (j === 0) ctx.moveTo(cx, screenY - 2)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      ctx.lineCap = 'butt'
    }

    // Fragile cracks
    if (p.type === 'fragile') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1
      const cx = p.x + p.width / 2
      ctx.beginPath()
      ctx.moveTo(cx - 10, screenY + 2)
      ctx.lineTo(cx - 2, screenY + h / 2)
      ctx.lineTo(cx + 8, screenY + 3)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx + 3, screenY + h - 2)
      ctx.lineTo(cx - 4, screenY + h / 2 + 1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - 15, screenY + h - 3)
      ctx.lineTo(cx - 8, screenY + h / 2)
      ctx.stroke()
    }

    // Moving platform arrows
    if (p.type === 'moving') {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      const arrowY = screenY + h / 2
      const dir = p.movingDir
      ctx.beginPath()
      ctx.moveTo(p.x + p.width / 2 + dir * 8, arrowY)
      ctx.lineTo(p.x + p.width / 2 - dir * 3, arrowY - 3)
      ctx.lineTo(p.x + p.width / 2 - dir * 3, arrowY + 3)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  // ── BLOB RENDERING ─────────────────────────────────────

  _drawBlob(ctx, x, screenY, isDead) {
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
    ctx.translate(x, screenY)
    ctx.scale(scaleX, scaleY)

    // Body with 3-stop radial gradient
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

    // Top-left shine — proporzioni canonical (cx:100 cy:90 rx:24 ry:15 rot:-30°)
    // Tradotto dal viewBox 300 al canvas r-based: offset (-0.38r, -0.49r), size 0.183r × 0.115r
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

    if (isDead) {
      this._drawDeadEyes(ctx, r)
    } else {
      this._drawAliveEyes(ctx, r)
    }

    ctx.restore()
  }

  _drawAliveEyes(ctx, r) {
    const blob = this.blob
    const OUTLINE = '#1F2937'
    // Proporzioni canonical (MiniBlob/Blob): occhi a (±100, 115) ry=40 in viewBox 300.
    // Tradotto al canvas r-based: spacing=0.38r, y=-0.30r, rx=0.26r, ry=0.31r
    const lookX = Math.max(-1, Math.min(1, blob.vx / 200))
    const eyeSpacing = r * 0.38
    const eyeY = -r * 0.30
    const eyeRx = r * 0.26
    const eyeRy = r * 0.31
    const hlR = r * 0.07
    const lookOff = lookX * (eyeRx * 0.32)
    const lookYOff = blob.vy > 300 ? 1.5 : blob.vy < -400 ? -1.5 : 0

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing

      // Solid dark eye
      ctx.fillStyle = OUTLINE
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()

      // Highlight bianco principale (offset top-right interno all'occhio)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + lookOff + eyeRx * 0.32, eyeY + lookYOff - eyeRy * 0.33, hlR, 0, Math.PI * 2)
      ctx.fill()

      // Sparkle bottom-left
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(ex + lookOff - eyeRx * 0.27, eyeY + lookYOff + eyeRy * 0.37, hlR * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Smile — canonical: ampiezza 56 (±28) profondità 14 a y=160 in viewBox 300.
    // Tradotto: mouthW=0.21r, mouthY=0.05r, depth=0.11r, strokeWidth=0.054r
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
    // Stessa posizione occhi della pose alive (allineato al canonical)
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

    // Sad mouth — vicino agli occhi come la smile canonical
    ctx.beginPath()
    ctx.arc(0, r * 0.15, r * 0.21, Math.PI * 0.15, Math.PI * 0.85, true)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  _renderDeathFrame() {
    this.render()
    const cam = this.cameraY
    const screenY = Math.min(this.blob.y - cam, GAME_HEIGHT - 40)
    this._drawBlob(this.ctx, this.blob.x, screenY, true)
  }

  _lighten(hex, amount) {
    const rgb = hexToRgb(hex)
    return `rgb(${Math.min(255, rgb[0] + amount)},${Math.min(255, rgb[1] + amount)},${Math.min(255, rgb[2] + amount)})`
  }

  stop() {
    this._stopped = true
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.input?.destroy()
  }
}
