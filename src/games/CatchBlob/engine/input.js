// Keyboard + external (touch) input for the basket.
// Returns a direction in [-1, +1]. The engine applies acceleration/friction.

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this._keyDir = 0
    this._externalDir = 0
    this._hasExternal = false
    this._keysHeld = { left: false, right: false }
    this._cleanup = []
  }

  async init() {
    this._setupKeyboard()
  }

  getDirection() {
    if (this._hasExternal) return this._externalDir
    return this._keyDir
  }

  setExternalDirection(d) {
    this._externalDir = Math.max(-1, Math.min(1, d))
    this._hasExternal = true
  }

  clearExternalDirection() {
    this._externalDir = 0
    this._hasExternal = false
  }

  update(dt) {
    const keyTarget = (this._keysHeld.right ? 1 : 0) - (this._keysHeld.left ? 1 : 0)
    const keySpeed = 8
    this._keyDir += (keyTarget - this._keyDir) * Math.min(1, keySpeed * dt)
    if (Math.abs(this._keyDir) < 0.01) this._keyDir = 0
  }

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
