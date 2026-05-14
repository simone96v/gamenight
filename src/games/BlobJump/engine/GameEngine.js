import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, PLATFORM, lerp, isLanding } from './physics'
import { createRNG } from './rng'
import { generatePlatforms } from './platformGenerator'
import { InputManager } from './input'
import { BLOB_GRADIENTS } from '../../../utils/colors'

const BG_COLORS = [
  { stop: 0, color: [243, 237, 255] },
  { stop: 0.25, color: [219, 234, 254] },
  { stop: 0.55, color: [165, 180, 252] },
  { stop: 0.8, color: [88, 80, 150] },
  { stop: 1, color: [30, 27, 75] },
]

const PLATFORM_STYLES = {
  normal: { fill: '#8B5CF6', stroke: '#7C3AED', glow: null },
  moving: { fill: '#22D3EE', stroke: '#06B6D4', glow: 'rgba(34,211,238,0.35)' },
  fragile: { fill: '#FB923C', stroke: '#EA580C', glow: null },
  spring: { fill: '#F43F5E', stroke: '#E11D48', glow: 'rgba(244,63,94,0.3)' },
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

    this.rng = createRNG(seed)
    this.platforms = generatePlatforms(this.rng, 500)

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
    this.isDead = false
    this.deathScore = 0
    this.rafId = null
    this.lastTime = 0
    this.elapsed = 0
    this.input = null

    this.squash = 1
    this.squashTimer = 0
    this.lastLandedPlatform = null

    this.breakParticles = []
    this.landingParticles = []
    this.bgParticles = this._generateBgParticles()
    this.stars = this._generateStars()

    this.springCompress = {}

    this.totalHeight = Math.abs(this.platforms[this.platforms.length - 1].y)
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

  update(dt) {
    const blob = this.blob

    // Update input smooth states (keyboard ramp, tilt filter)
    this.input.update(dt)

    // Direction-based movement with acceleration + friction
    const dir = this.input.getDirection()
    const maxSpeed = PHYSICS.MOVE_SPEED
    const accel = PHYSICS.MOVE_ACCEL
    const friction = PHYSICS.MOVE_FRICTION

    if (Math.abs(dir) > 0.01) {
      // Accelerate toward target velocity
      const targetVx = dir * maxSpeed
      blob.vx += (targetVx - blob.vx) * Math.min(1, accel * dt)
    } else {
      // Apply friction to decelerate
      blob.vx *= Math.pow(friction, dt * 60)
      if (Math.abs(blob.vx) < 2) blob.vx = 0
    }

    blob.vy += PHYSICS.GRAVITY * dt
    blob.y += blob.vy * dt
    blob.x += blob.vx * dt

    if (blob.x > GAME_WIDTH + PHYSICS.BLOB_RADIUS) blob.x = -PHYSICS.BLOB_RADIUS
    if (blob.x < -PHYSICS.BLOB_RADIUS) blob.x = GAME_WIDTH + PHYSICS.BLOB_RADIUS

    for (const p of this.platforms) {
      if (p.type !== 'moving' || p.broken) continue
      p.x += p.movingDir * p.movingSpeed * dt
      if (p.x <= 0) { p.x = 0; p.movingDir = 1 }
      if (p.x + p.width >= GAME_WIDTH) { p.x = GAME_WIDTH - p.width; p.movingDir = -1 }
    }

    // Spring decompress
    for (const key of Object.keys(this.springCompress)) {
      this.springCompress[key] -= dt * 6
      if (this.springCompress[key] <= 0) delete this.springCompress[key]
    }

    if (blob.vy > 0) {
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i]
        if (!this._isVisible(p)) continue
        if (isLanding(blob, p)) {
          if (p.type === 'spring') {
            blob.vy = PHYSICS.SPRING_VELOCITY
            this.squash = 0.55
            this.springCompress[i] = 1
          } else {
            blob.vy = PHYSICS.JUMP_VELOCITY
            this.squash = 0.7
          }
          this.squashTimer = 0.12
          this.lastLandedPlatform = p

          this._spawnLandingParticles(blob.x, p.y, p.type)

          if (p.type === 'fragile') {
            p.broken = true
            this._spawnBreakParticles(p)
          }
          break
        }
      }
    }

    if (this.squashTimer > 0) {
      this.squashTimer -= dt
      if (this.squashTimer <= 0) this.squash = 1
    }

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

    const targetCameraY = blob.y - GAME_HEIGHT * 0.65
    if (targetCameraY < this.cameraY) {
      const smoothing = 1 - Math.pow(0.0001, dt)
      this.cameraY += (targetCameraY - this.cameraY) * smoothing
    }

    const height = (GAME_HEIGHT - 80 - blob.y)
    if (height > this.maxHeight) {
      this.maxHeight = height
      this.score = Math.floor(this.maxHeight / PHYSICS.PIXELS_PER_METER)
      this.onScoreUpdate?.(this.score)
    }

    if (blob.y - this.cameraY > GAME_HEIGHT + 60) {
      this.die()
    }
  }

  die() {
    this.isDead = true
    this.deathScore = this.score
    this._renderDeathFrame()
    this.onDeath?.(this.score)
  }

  _isVisible(platform) {
    const screenY = platform.y - this.cameraY
    return screenY > -50 && screenY < GAME_HEIGHT + 50
  }

  _spawnBreakParticles(platform) {
    const cx = platform.x + platform.width / 2
    const cy = platform.y
    for (let i = 0; i < 8; i++) {
      this.breakParticles.push({
        x: cx + (Math.random() - 0.5) * platform.width,
        y: cy + Math.random() * PLATFORM.HEIGHT,
        vx: (Math.random() - 0.5) * 250,
        vy: -Math.random() * 180 - 40,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 0.5 + Math.random() * 0.4,
        color: PLATFORM_STYLES.fragile.fill,
      })
    }
  }

  _spawnLandingParticles(x, platformY, type) {
    const color = PLATFORM_STYLES[type]?.fill || PLATFORM_STYLES.normal.fill
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8
      const speed = 40 + Math.random() * 80
      this.landingParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: platformY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.25 + Math.random() * 0.2,
        color,
        size: 2 + Math.random() * 2,
      })
    }
  }

  // ── RENDER ──────────────────────────────────────────────

  render() {
    const ctx = this.ctx
    const cam = this.cameraY

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    const progress = Math.min(1, this.maxHeight / (this.totalHeight * 0.7))
    this._drawBackground(ctx, progress)
    this._drawBgParticles(ctx, cam, progress)
    this._drawStars(ctx, cam, progress)

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i]
      if (p.broken) continue
      const screenY = p.y - cam
      if (screenY < -30 || screenY > GAME_HEIGHT + 30) continue
      this._drawPlatform(ctx, p, screenY, i)
    }

    this._drawParticles(ctx, cam)

    if (!this.isDead) {
      this._drawBlob(ctx, this.blob.x, this.blob.y - cam, false)
    }
  }

  _drawBackground(ctx, progress) {
    const bgColor = lerpColor(BG_COLORS, progress)
    const bgTop = lerpColor(BG_COLORS, Math.min(1, progress + 0.15))
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, `rgb(${bgTop[0]},${bgTop[1]},${bgTop[2]})`)
    grad.addColorStop(1, `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
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

  _drawParticles(ctx, cam) {
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
  }

  _drawPlatform(ctx, p, screenY, idx) {
    const style = PLATFORM_STYLES[p.type] || PLATFORM_STYLES.normal
    const r = PLATFORM.HEIGHT / 2
    const h = PLATFORM.HEIGHT

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

    // Subtle top shine
    ctx.strokeStyle = `rgba(255,255,255,0.3)`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p.x + r, screenY + 1.5)
    ctx.lineTo(p.x + p.width - r, screenY + 1.5)
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
      for (let i = 0; i <= coils * 2; i++) {
        const t = i / (coils * 2)
        const sx = cx + (i % 2 === 0 ? -coilW : coilW)
        const sy = screenY - 2 - t * coilH
        if (i === 0) ctx.moveTo(cx, screenY - 2)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      ctx.lineCap = 'butt'
    }

    // Fragile cracks
    if (p.type === 'fragile') {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'
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
      // Small arrow indicating direction
      ctx.beginPath()
      ctx.moveTo(p.x + p.width / 2 + dir * 8, arrowY)
      ctx.lineTo(p.x + p.width / 2 - dir * 3, arrowY - 3)
      ctx.lineTo(p.x + p.width / 2 - dir * 3, arrowY + 3)
      ctx.closePath()
      ctx.fill()
    }
  }

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

    // Body with 3-stop radial gradient from BLOB_GRADIENTS
    const [light, mid, dark] = this.blobGrad
    const bodyGrad = ctx.createRadialGradient(-4, -5, 1, 0, 2, r * 1.1)
    bodyGrad.addColorStop(0, light)
    bodyGrad.addColorStop(0.55, mid)
    bodyGrad.addColorStop(1, dark)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Subtle inner glow
    const glowGrad = ctx.createRadialGradient(-3, -4, 0, 0, 0, r)
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.25)')
    glowGrad.addColorStop(0.5, 'rgba(255,255,255,0)')
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Outline
    ctx.strokeStyle = dark
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()

    if (isDead) {
      this._drawDeadEyes(ctx, r)
    } else {
      this._drawAliveEyes(ctx, r)
    }

    ctx.restore()
  }

  _drawAliveEyes(ctx, r) {
    const blob = this.blob
    const lookDir = blob.vx > 30 ? 1 : blob.vx < -30 ? -1 : 0
    const eyeSpacing = r * 0.42
    const eyeY = -r * 0.12
    const eyeRx = r * 0.28
    const eyeRy = r * 0.32
    const pupilR = r * 0.15
    const pupilOff = lookDir * 2.8
    const pupilYOff = blob.vy > 300 ? 1.5 : blob.vy < -400 ? -1.5 : 0.5

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing

      // White
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Iris
      ctx.fillStyle = '#6D28D9'
      ctx.beginPath()
      ctx.arc(ex + pupilOff * 0.6, eyeY + pupilYOff, pupilR * 1.15, 0, Math.PI * 2)
      ctx.fill()

      // Pupil
      ctx.fillStyle = '#1E1B4B'
      ctx.beginPath()
      ctx.arc(ex + pupilOff, eyeY + pupilYOff, pupilR * 0.7, 0, Math.PI * 2)
      ctx.fill()

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(ex + pupilOff + 1.8, eyeY + pupilYOff - 2, pupilR * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawDeadEyes(ctx, r) {
    const eyeSpacing = r * 0.42
    const eyeY = -r * 0.1
    const s = r * 0.22

    ctx.strokeStyle = '#1E1B4B'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'

    for (const side of [-1, 1]) {
      const ex = side * eyeSpacing
      // X shape
      ctx.beginPath()
      ctx.moveTo(ex - s, eyeY - s)
      ctx.lineTo(ex + s, eyeY + s)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ex + s, eyeY - s)
      ctx.lineTo(ex - s, eyeY + s)
      ctx.stroke()
    }

    // Sad mouth
    ctx.beginPath()
    ctx.arc(0, r * 0.35, r * 0.25, Math.PI * 0.15, Math.PI * 0.85, true)
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
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.input?.destroy()
  }
}
