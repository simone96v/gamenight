// Input single-action: tap / click / space / arrow-up. Edge-triggered: ogni press
// produce un evento jump che l'engine consuma in update().
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this._pendingJump = false
    this._cleanup = []
  }

  async init() {
    const onKeyDown = (e) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault()
        this._pendingJump = true
      }
    }
    window.addEventListener('keydown', onKeyDown)
    this._cleanup.push(() => window.removeEventListener('keydown', onKeyDown))
  }

  /** Consuma il jump pendente: ritorna true una sola volta per press. */
  consumeJump() {
    if (!this._pendingJump) return false
    this._pendingJump = false
    return true
  }

  /** Chiamato dalla zona tap della UI o da click diretto sul canvas. */
  triggerJump() {
    this._pendingJump = true
  }

  destroy() {
    this._cleanup.forEach((fn) => fn())
    this._cleanup = []
  }
}
