/**
 * InputManager — single-tap flap controller.
 *
 * Listens to:
 *   - pointerdown / touchstart on the canvas
 *   - Space / ArrowUp / W on window
 * Calls the `onFlap` callback for each valid flap (debounced ~60ms).
 */
export class InputManager {
  constructor(canvas, onFlap) {
    this.canvas = canvas
    this.onFlap = onFlap
    this._lastFlap = 0
    this._cleanup = []
    this._suspended = false
  }

  async init() {
    const tryFlap = (e) => {
      if (e) e.preventDefault?.()
      if (this._suspended) return
      const now = performance.now()
      if (now - this._lastFlap < 60) return
      this._lastFlap = now
      this.onFlap?.()
    }

    const onKey = (e) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        tryFlap(e)
      }
    }

    const onPointer = (e) => tryFlap(e)

    window.addEventListener('keydown', onKey)
    this.canvas.addEventListener('pointerdown', onPointer, { passive: false })

    this._cleanup.push(() => {
      window.removeEventListener('keydown', onKey)
      this.canvas.removeEventListener('pointerdown', onPointer)
    })
  }

  flap() {
    if (this._suspended) return
    const now = performance.now()
    if (now - this._lastFlap < 60) return
    this._lastFlap = now
    this.onFlap?.()
  }

  suspend() { this._suspended = true }
  resume() { this._suspended = false }

  destroy() {
    this._cleanup.forEach((fn) => fn())
    this._cleanup = []
  }
}
