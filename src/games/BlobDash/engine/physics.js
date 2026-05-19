// Game viewport — landscape feel ma manteniamo le proporzioni "stretto verticale"
// del resto della app per non rompere il layout. Lo scroll è orizzontale dentro
// questa stessa area: la camera si muove sull'asse X.
export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

// Ground line (y del pavimento). Il blob "cammina" sopra a questa y.
export const GROUND_Y = GAME_HEIGHT - 120

// Blob piazzato a 1/4 dello schermo (lascia spazio davanti per leggere gli ostacoli).
export const BLOB_X = GAME_WIDTH * 0.28

export const PHYSICS = {
  // Geometry-Dash-style: salto secco e breve. Air time ≈ 0.45s.
  // jump_height = JUMP_VELOCITY² / (2*GRAVITY) ≈ 91px (poco più di 2 tile).
  // Block_stack h=2 (80px) atterrabile con margine 11px.
  GRAVITY: 3600,
  JUMP_VELOCITY: -870,        // jump_height ≈ 105px, air time ≈ 0.48s
  PAD_VELOCITY: -1350,        // pad boost: jump_height ≈ 253px
  MAX_FALL_SPEED: 2200,
  BLOB_RADIUS: 18,

  // Scroll del mondo (cresce con la distanza percorsa).
  SCROLL_SPEED_START: 420,
  SCROLL_SPEED_MAX: 700,
  SCROLL_SPEED_RAMP_PER_METER: 0.24, // px/s in più per ogni metro percorso

  // 1 metro = 18px di world (con scroll iniziale ≈18m/s, leggibile come 1m all'arrivo).
  PIXELS_PER_METER: 18,

  // Hitbox shrink per dare margine di forgiveness al giocatore (collision più piccola del visuale).
  HITBOX_SHRINK: 0.82,
}

// Unità modulare usata dal generator: 1 "tile" = 40px di world.
// Tutti gli ostacoli si misurano in tile (es. block h:1 = un blocco alto 40px).
export const TILE = 40

export const OBSTACLE = {
  SPIKE_W: TILE,           // base
  SPIKE_H: TILE * 0.72,    // altezza triangolo (più basso del block per leggibilità)
  BLOCK_W: TILE,
  BLOCK_H: TILE,
  PAD_W: TILE,
  PAD_H: TILE * 0.35,      // pad basso, una rampetta sul terreno
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}
