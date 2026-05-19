export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

export const BASKET = {
  WIDTH: 86,
  HEIGHT: 38,
  Y: GAME_HEIGHT - 130,        // top edge of basket opening (raised so player's thumb on controls doesn't cover the basket)
  MOVE_SPEED: 620,
  MOVE_ACCEL: 22,
  MOVE_FRICTION: 0.82,
}

export const ITEM = {
  RADIUS: 16,
  BASE_FALL_SPEED: 165,        // px/s at base wave (multiplied by wave.fallSpeedMul)
  FALL_GRAVITY: 28,            // gentle accel so falls feel weighty
}

// Difficulty waves. Each wave defines a chunk of game time with its own
// spawn cadence, fall speed multiplier, and malus probability. The transition
// between waves is signaled to the UI via onWaveChange so it can pop a banner.
//
// Tuning principles:
//   - Wave 1 is a calm intro (no malus) so the player can learn controls.
//   - Wave 2 onward introduces malus and progressively shortens the spawn
//     interval and speeds up falls.
//   - Wave 6 is the perpetual "survival" tier — game stays here forever once
//     reached, so it must remain challenging but not deterministic-death.
// Wave 1 parte già al ritmo del vecchio "Pressione" (l'ex stage 3) con uno
// spawn più fitto: niente warm-up, si entra subito nel gioco. Le wave
// successive accelerano di conseguenza per mantenere la rampa di difficoltà.
export const WAVES = [
  { id: 1, name: 'Pressione',      until: 30,       spawnInterval: 0.72, fallSpeedMul: 1.32, malusRate: 0.20, starRate: 0.06 },
  { id: 2, name: 'Frenesia',       until: 70,       spawnInterval: 0.62, fallSpeedMul: 1.50, malusRate: 0.30, starRate: 0.05 },
  { id: 3, name: 'Caos',           until: 120,      spawnInterval: 0.52, fallSpeedMul: 1.72, malusRate: 0.36, starRate: 0.05 },
  { id: 4, name: 'Tempesta',       until: 180,      spawnInterval: 0.44, fallSpeedMul: 1.95, malusRate: 0.42, starRate: 0.04 },
  { id: 5, name: 'Sopravvivenza',  until: 260,      spawnInterval: 0.38, fallSpeedMul: 2.18, malusRate: 0.46, starRate: 0.04 },
  { id: 6, name: 'Inferno',        until: Infinity, spawnInterval: 0.32, fallSpeedMul: 2.45, malusRate: 0.50, starRate: 0.03 },
]

export function getWaveForElapsed(elapsed) {
  for (const w of WAVES) {
    if (elapsed < w.until) return w
  }
  return WAVES[WAVES.length - 1]
}

// Combo thresholds (catches → multiplier)
export const COMBO = [
  { hits: 0,  mult: 1 },
  { hits: 3,  mult: 1.5 },
  { hits: 7,  mult: 2 },
  { hits: 12, mult: 3 },
]
