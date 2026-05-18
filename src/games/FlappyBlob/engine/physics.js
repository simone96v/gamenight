export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

export const PHYSICS = {
  GRAVITY: 1400,
  FLAP_VELOCITY: -440,
  MAX_FALL_SPEED: 720,
  BLOB_X: 110,
  BLOB_RADIUS: 20,
  HITBOX_SHRINK: 0.78, // fraction of radius used for AABB collision (more forgiving)
}

export const PIPE = {
  WIDTH: 64,
  CAP_HEIGHT: 22,
  CAP_OVERHANG: 6,
  GAP_MIN: 145,
  GAP_MAX: 175,
  GAP_DECAY: 0.04, // per-pipe gap reduction toward GAP_MIN as difficulty ramps
  SPACING_START: 230,
  SPACING_MIN: 190,
  SPEED_START: 175, // px/s
  SPEED_MAX: 260,
  SPEED_RAMP_PER_PIPE: 1.4, // px/s gained per pipe passed
  MARGIN_TOP: 60,
  MARGIN_BOTTOM: 60, // measured from ground top
}

export const GROUND = {
  HEIGHT: 64,
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}
