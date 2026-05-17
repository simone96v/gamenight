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
  BASE_FALL_SPEED: 165,        // px/s at t=0
  FALL_GRAVITY: 28,            // px/s² — gentle accel so falls feel weighty
  SPEED_RAMP_PER_SEC: 0.018,   // +1.8% per second
  SPEED_RAMP_CAP: 2.4,         // 2.4× base after long survival
}

// Spawn cadence ramp (seconds between spawns)
export const SPAWN = {
  START_INTERVAL: 1.0,
  MIN_INTERVAL: 0.42,
  RAMP_SECONDS: 75,            // reach min interval in ~75s
}

// Item type weights (must sum to 1 for clarity)
export const ITEM_WEIGHTS = {
  right:  0.55,
  wrong:  0.35,
  bomb:   0.05,
  star:   0.05,
}

// Combo thresholds (catches → multiplier)
export const COMBO = [
  { hits: 0,  mult: 1 },
  { hits: 3,  mult: 1.5 },
  { hits: 7,  mult: 2 },
  { hits: 12, mult: 3 },
]
