export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

export const BASKET = {
  WIDTH: 86,
  HEIGHT: 38,
  Y: GAME_HEIGHT - 70,         // top edge of basket opening
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
export const WAVES = [
  { id: 1, name: 'Calma',          until: 12,       spawnInterval: 1.10, fallSpeedMul: 1.00, malusRate: 0.00, starRate: 0.08 },
  { id: 2, name: 'Risveglio',      until: 35,       spawnInterval: 0.95, fallSpeedMul: 1.15, malusRate: 0.18, starRate: 0.06 },
  { id: 3, name: 'Pressione',      until: 75,       spawnInterval: 0.82, fallSpeedMul: 1.32, malusRate: 0.28, starRate: 0.05 },
  { id: 4, name: 'Frenesia',       until: 130,      spawnInterval: 0.68, fallSpeedMul: 1.52, malusRate: 0.34, starRate: 0.05 },
  { id: 5, name: 'Caos',           until: 200,      spawnInterval: 0.56, fallSpeedMul: 1.80, malusRate: 0.40, starRate: 0.04 },
  { id: 6, name: 'Sopravvivenza',  until: Infinity, spawnInterval: 0.46, fallSpeedMul: 2.10, malusRate: 0.45, starRate: 0.04 },
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
