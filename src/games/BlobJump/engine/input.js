// Input system — no physics constants needed; engine applies acceleration.

/**
 * InputManager — handles keyboard and touch controls.
 *
 * Two input methods produce a normalized direction in [-1, +1].
 * The GameEngine reads `getDirection()` and applies acceleration/friction
 * for smooth, analog-feeling movement on every platform.
 *
 * Touch: tap left/right half of screen for full direction.
 * Keys:  smooth ramp up/down with virtual analog stick.
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas

    // Normalized direction: -1 (full left) to +1 (full right)
    this._keyDir = 0
    this._externalDir = 0
    this._hasExternal = false

    // Keyboard smooth ramp state
    this._keysHeld = { left: false, right: false }

    this._cleanup = []
  }

  async init() {
    this._setupKeyboard()
  }

  /**
   * Returns the raw direction in [-1, +1] from the highest-priority active input.
   * Priority: external (overlay buttons) > touch (screen halves) > keyboard.
   * The engine applies acceleration/friction on top of this.
   */
  getDirection() {
    if (this._hasExternal) return this._externalDir
    return this._keyDir
  }

  /** Called by external UI (e.g. React slider) to override touch direction. */
  setExternalDirection(d) {
    this._externalDir = Math.max(-1, Math.min(1, d))
    this._hasExternal = true
  }

  /** Called when external control releases (thumb returns to center). */
  clearExternalDirection() {
    this._externalDir = 0
    this._hasExternal = false
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
  }

  // ── Keyboard ─────────────────────────────────────────

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

  destroy() {
    this._cleanup.forEach((fn) => fn())
    this._cleanup = []
  }
}
