// Snake — engine "tape" deterministico.
// Griglia 17x24 (W x H), tick a velocità che cresce con la lunghezza.
// Input bufferizzato: una direzione "next" che si applica al prossimo tick
// (così premere ←↑ in rapida successione fa la curva senza skip).

import { createRNG } from './rng.js'

export const COLS = 17
export const ROWS = 24

// Direzioni: dx, dy in celle
export const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y:  1 },
  left:  { x: -1, y: 0 },
  right: { x:  1, y: 0 },
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

// Velocità: ms per tick. Più alto = più lento.
// Parte tranquillo, accelera lentamente, max ~7 mosse/sec.
const TICK_START = 180
const TICK_MIN   = 80
const TICK_STEP  = 6 // ms in meno ogni X cibi
const STEP_EVERY = 3 // ogni 3 cibi mangiati, scende di TICK_STEP

export class SnakeEngine {
  constructor({ seed = 0, onScore, onDeath, onEat }) {
    this.rng = createRNG(seed || 1)
    this.cols = COLS
    this.rows = ROWS
    this.onScore = onScore || (() => {})
    this.onDeath = onDeath || (() => {})
    this.onEat = onEat || (() => {})

    // start: serpente di 4 al centro, diretto a destra
    const cy = Math.floor(ROWS / 2)
    const cx = Math.floor(COLS / 2) - 2
    this.snake = [
      { x: cx + 3, y: cy },
      { x: cx + 2, y: cy },
      { x: cx + 1, y: cy },
      { x: cx,     y: cy },
    ]
    this.dir = 'right'
    this.nextDir = 'right'
    this.queuedDir = null // secondo input bufferizzato per consecutive curves
    this.food = this._spawnFood()
    this.score = 0
    this.eaten = 0
    this.alive = true
    this.tickMs = TICK_START
    this._acc = 0
    this._lastTime = null
    this._lastEatPulse = 0
  }

  // direction: 'up'|'down'|'left'|'right'. Ignora U-turn istantaneo.
  setDirection(d) {
    if (!DIRS[d] || !this.alive) return
    // Confronta con la direzione effettiva (this.dir) — se è opposta, ignora.
    // Se è uguale o opposta a nextDir, ignora.
    if (d === this.dir || d === OPPOSITE[this.dir]) {
      // Se invece era un cambio già in attesa, mettilo come queued
      // così la mossa successiva è già pronta.
      if (this.nextDir !== this.dir && d !== this.nextDir && d !== OPPOSITE[this.nextDir]) {
        this.queuedDir = d
      }
      return
    }
    if (d === OPPOSITE[this.nextDir]) return
    if (d === this.nextDir) {
      this.queuedDir = null
      return
    }
    // Se abbiamo già un nextDir diverso da dir non ancora applicato, salviamo il successivo.
    if (this.nextDir !== this.dir) {
      this.queuedDir = d
    } else {
      this.nextDir = d
    }
  }

  // Aggiorna in real-time (RAF). Avanza N tick interi se è passato abbastanza tempo.
  update(timestamp) {
    if (!this.alive) return
    if (this._lastTime == null) {
      this._lastTime = timestamp
      return
    }
    const dt = timestamp - this._lastTime
    this._lastTime = timestamp
    this._acc += dt
    while (this._acc >= this.tickMs && this.alive) {
      this._acc -= this.tickMs
      this._tick()
    }
  }

  _tick() {
    // Applica nextDir
    this.dir = this.nextDir
    // Promuovi queued, se compatibile con la nuova dir
    if (this.queuedDir && this.queuedDir !== OPPOSITE[this.dir] && this.queuedDir !== this.dir) {
      this.nextDir = this.queuedDir
    }
    this.queuedDir = null

    const d = DIRS[this.dir]
    const head = this.snake[0]
    const nx = head.x + d.x
    const ny = head.y + d.y

    // Collisione muri
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.alive = false
      this.onDeath(this.score)
      return
    }

    const willEat = (this.food && nx === this.food.x && ny === this.food.y)

    // Collisione coda. La coda si muove di una cella, quindi l'ultima
    // posizione si libera SE non mangiamo. Permettiamo di entrare nella
    // cella della coda solo se non stiamo crescendo.
    const limit = willEat ? this.snake.length : this.snake.length - 1
    for (let i = 0; i < limit; i++) {
      const s = this.snake[i]
      if (s.x === nx && s.y === ny) {
        this.alive = false
        this.onDeath(this.score)
        return
      }
    }

    // Avanza
    this.snake.unshift({ x: nx, y: ny })
    if (!willEat) {
      this.snake.pop()
    } else {
      this.eaten += 1
      this.score += 1
      this._lastEatPulse = performance.now()
      // Accelera ogni STEP_EVERY cibi
      if (this.eaten % STEP_EVERY === 0) {
        this.tickMs = Math.max(TICK_MIN, this.tickMs - TICK_STEP)
      }
      this.food = this._spawnFood()
      this.onEat(this.score)
      this.onScore(this.score)
    }
  }

  _spawnFood() {
    // Posiziona cibo in cella libera. Con griglia 17x24 = 408 celle è
    // praticamente sempre veloce.
    const occupied = new Set(this.snake.map((s) => `${s.x},${s.y}`))
    let safety = 0
    while (safety++ < 500) {
      const x = Math.floor(this.rng() * this.cols)
      const y = Math.floor(this.rng() * this.rows)
      if (!occupied.has(`${x},${y}`)) return { x, y }
    }
    // Fallback: prima cella libera
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!occupied.has(`${x},${y}`)) return { x, y }
      }
    }
    return null // griglia piena (impossibile)
  }

  // Tempo (ms) dall'ultimo pasto — usato dalla UI per pulsare la testa.
  timeSinceLastEat() {
    return performance.now() - this._lastEatPulse
  }
}
