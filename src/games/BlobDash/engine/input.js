// One-button input per Blob Dash: tap/click/space → richiesta di salto.
// La richiesta viene "consumata" dall'engine: il jump buffer (≈100ms)
// è gestito nell'update loop usando il timestamp dell'ultima richiesta.
export class InputManager {
  constructor() {
    this._cleanup = []
    this._jumpRequested = false
  }

  init() {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        this._jumpRequested = true
      }
    }
    window.addEventListener('keydown', onKey)
    this._cleanup.push(() => window.removeEventListener('keydown', onKey))
  }

  /** Chiamato da overlay touch/click esterni. */
  requestJump() {
    this._jumpRequested = true
  }

  /** L'engine lo invoca una volta per frame: consuma la richiesta. */
  consumeJump() {
    const j = this._jumpRequested
    this._jumpRequested = false
    return j
  }

  destroy() {
    this._cleanup.forEach((fn) => fn())
    this._cleanup = []
  }
}
