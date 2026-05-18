// Input handler per Snake.
// - Tastiera: WASD + frecce.
// - Swipe: prima dell'inizio di un nuovo gesto rileviamo dx/dy dominante,
//   con soglia ~20px così non confondiamo tap con swipe.
// L'engine si occupa di filtrare U-turn e di bufferizzare la mossa successiva.

const SWIPE_MIN = 18

export class InputHandler {
  constructor(engine) {
    this.engine = engine
    this.start = null
    this.locked = false
    this._onKey = this._onKey.bind(this)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
  }

  attach(surface) {
    this.surface = surface
    window.addEventListener('keydown', this._onKey, { passive: false })
    surface.addEventListener('pointerdown', this._onPointerDown)
    surface.addEventListener('pointermove', this._onPointerMove, { passive: false })
    surface.addEventListener('pointerup', this._onPointerUp)
    surface.addEventListener('pointercancel', this._onPointerUp)
  }

  detach() {
    window.removeEventListener('keydown', this._onKey)
    if (!this.surface) return
    this.surface.removeEventListener('pointerdown', this._onPointerDown)
    this.surface.removeEventListener('pointermove', this._onPointerMove)
    this.surface.removeEventListener('pointerup', this._onPointerUp)
    this.surface.removeEventListener('pointercancel', this._onPointerUp)
    this.surface = null
  }

  _onKey(e) {
    let dir = null
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dir = 'up'; break
      case 'ArrowDown': case 's': case 'S': dir = 'down'; break
      case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break
      case 'ArrowRight': case 'd': case 'D': dir = 'right'; break
      default: return
    }
    e.preventDefault()
    this.engine.setDirection(dir)
  }

  _onPointerDown(e) {
    this.start = { x: e.clientX, y: e.clientY }
    this.locked = false
  }

  _onPointerMove(e) {
    if (!this.start || this.locked) return
    const dx = e.clientX - this.start.x
    const dy = e.clientY - this.start.y
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)
    if (Math.max(ax, ay) < SWIPE_MIN) return
    e.preventDefault?.()
    let dir
    if (ax > ay) dir = dx > 0 ? 'right' : 'left'
    else dir = dy > 0 ? 'down' : 'up'
    this.engine.setDirection(dir)
    // Reset start dove siamo ora così uno swipe lungo continuo
    // permette eventualmente una seconda curva.
    this.start = { x: e.clientX, y: e.clientY }
  }

  _onPointerUp() {
    this.start = null
    this.locked = false
  }
}
