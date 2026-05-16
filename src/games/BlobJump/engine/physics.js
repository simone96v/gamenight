export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

export const PHYSICS = {
  GRAVITY: 1500,
  JUMP_VELOCITY: -620,
  SPRING_VELOCITY: -1050,
  MOVE_SPEED: 500,        // max horizontal speed (px/s)
  MOVE_ACCEL: 20,         // acceleration toward target (higher = snappier)
  MOVE_FRICTION: 0.85,    // per-frame friction when no input (0 = instant stop, 1 = no friction)
  BLOB_RADIUS: 18,
  PIXELS_PER_METER: 10,
  MOVING_PLATFORM_BOOST: 0.35, // fraction of platform vx added on landing
}

export const PLATFORM = {
  HEIGHT: 14,
  COLLISION_TOLERANCE: 22,    // generous tolerance to prevent tunneling at high speeds
  FRAGILE_BREAK_DELAY: 0.12, // seconds of shake before breaking
  MOVING_SPEED_MIN: 40,
  MOVING_SPEED_MAX: 130,
}

export function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

export function isLanding(blob, platform) {
  if (platform.broken) return false

  const blobBottom = blob.y + PHYSICS.BLOB_RADIUS
  const blobLeft = blob.x - PHYSICS.BLOB_RADIUS * 0.75
  const blobRight = blob.x + PHYSICS.BLOB_RADIUS * 0.75

  return (
    blobBottom >= platform.y &&
    blobBottom <= platform.y + PLATFORM.COLLISION_TOLERANCE &&
    blobRight >= platform.x &&
    blobLeft <= platform.x + platform.width
  )
}
