// Input system — no physics constants needed; engine applies acceleration.

/**
 * InputManager — handles keyboard, touch, and tilt controls.
 *
 * All three methods produce a normalized direction in [-1, +1].
 * The GameEngine reads `getDirection()` and applies acceleration/friction
 * for smooth, analog-feeling movement on every platform.
 *
 * Touch: proportional — finger distance from canvas center.
 * Tilt:  smoothed via low-pass filter, non-linear curve.
 * Keys:  smooth ramp up/down with virtual analog stick.
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas

    // Normalized direction: -1 (full left) to +1 (full right)
    this._touchDir = 0
    this._keyDir = 0
    this._tiltDir = 0

    // Keyboard smooth ramp state
    this._keysHeld = { left: false, right: false }

    // Tilt state
    this.useTilt = false
    this._rawGamma = 0
    this._smoothGamma = 0

    this._cleanup = []
  }

  async init() {
    this._setupKeyboard()
    this._setupTouch()
    await this._setupTilt()
  }

  /**
   * Returns the raw direction in [-1, +1] from the highest-priority active input.
   * Priority: tilt > touch > keyboard.
   * The engine applies acceleration/friction on top of this.
   */
  getDirection() {
    if (this.useTilt) return this._tiltDir
    if (this._touchDir !== 0) return this._touchDir
    return this._keyDir
  }

  /**
   * Call once per frame with delta time to update smooth states.
   */
  update(dt) {
    // Smooth keyboard ramp
    const keyTarget = (this._keysHeld.right ? 1 : 0) - (this._keysHeld.left ? 1 : 0)
    const keySpeed = 8 // ramp speed (higher = snappier)
    this._keyDir += (keyTarget - this._keyDir) * Math.min(1, keySpeed * dt)
    if (Math.abs(this._keyDir) < 0.01) this._keyDir = 0

    // Smooth tilt (low-pass filter)
    if (this.useTilt) {
      const alpha = 1 - Math.pow(0.001, dt) // ~0.93 per frame at 60fps
      this._smoothGamma += (this._rawGamma - this._smoothGamma) * alpha

      const deadZone = 4
      const maxAngle = 35
      const gamma = this._smoothGamma
      if (Math.abs(gamma) < deadZone) {
        this._tiltDir = 0
      } else {
        // Remove dead zone, normalize to [0, 1], apply curve
        const sign = gamma > 0 ? 1 : -1
        const magnitude = (Math.abs(gamma) - deadZone) / (maxAngle - deadZone)
        const clamped = Math.min(1, magnitude)
        // Slight exponential curve for better precision at small tilts
        this._tiltDir = sign * Math.pow(clamped, 1.3)
      }
    }
  }

  // ── Keyboard ──────────────────────────────────────────

  _setupKeyboard() {
    const onDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this._keysHeld.left = true
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keysHeld.right = true
    }
    const onUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this._keysHeld.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this._keysHeld.right = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    this._cleanup.push(() => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    })
  }

  // ── Touch ─────────────────────────────────────────────

  _setupTouch() {
    const el = this.canvas

    const calcDir = (x) => {
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const halfW = rect.width / 2
      // Distance from center normalized to [-1, +1]
      const offset = (x - center) / halfW
      // Apply dead zone + clamp
      const deadZone = 0.08
      if (Math.abs(offset) < deadZone) return 0
      const sign = offset > 0 ? 1 : -1
      const mag = (Math.abs(offset) - deadZone) / (1 - deadZone)
      return sign * Math.min(1, mag)
    }

    const onStart = (e) => {
      e.preventDefault()
      this._touchDir = calcDir(e.touches[0].clientX)
    }
    const onMove = (e) => {
      e.preventDefault()
      this._touchDir = calcDir(e.touches[0].clientX)
    }
    const onEnd = () => {
      this._touchDir = 0
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    this._cleanup.push(() => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    })
  }

  // ── Tilt (DeviceOrientation) ──────────────────────────

  async _setupTilt() {
    // Only attempt tilt on devices that likely have a gyroscope
    if (typeof DeviceOrientationEvent === 'undefined') return
    if (!('ontouchstart' in window)) return // desktop browsers — skip

    const listen = () => {
      this.useTilt = true
      const onOrient = (e) => {
        this._rawGamma = e.gamma || 0
      }
      window.addEventListener('deviceorientation', onOrient)
      this._cleanup.push(() => window.removeEventListener('deviceorientation', onOrient))
    }

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission()
        if (res === 'granted') listen()
      } catch {
        // Permission denied — touch fallback
      }
    } else {
      // Android / older iOS — check if events actually fire
      let received = false
      const probe = (e) => {
        if (e.gamma !== null && e.gamma !== undefined) received = true
      }
      window.addEventListener('deviceorientation', probe)
      // Wait a short time to see if we get real data
      await new Promise((r) => setTimeout(r, 300))
      window.removeEventListener('deviceorientation', probe)
      if (received) listen()
    }
  }

  destroy() {
    this._cleanup.forEach((fn) => fn())
    this._cleanup = []
  }
}
