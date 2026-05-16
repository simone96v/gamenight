import { GAME_WIDTH, GAME_HEIGHT, PHYSICS, PLATFORM, lerp } from './physics'

/**
 * Progressive difficulty zones:
 *   0-20%   EASY     — wide platforms, small gaps, mostly normal
 *   20-45%  MEDIUM   — narrower, moving platforms appear, some fragile
 *   45-70%  HARD     — tight gaps, lots of moving + fragile, springs as relief
 *   70-100% EXTREME  — narrow, fast-moving, fragile clusters, big gaps
 *
 * Key guarantee: every platform is reachable from the one below it.
 * The maximum jump reach is calculated from JUMP_VELOCITY and GRAVITY.
 */

// Maximum height a normal jump can reach (physics-derived)
const MAX_JUMP_HEIGHT = (PHYSICS.JUMP_VELOCITY * PHYSICS.JUMP_VELOCITY) / (2 * PHYSICS.GRAVITY)
// Use 75% of max jump for comfort margin
const SAFE_VERTICAL_GAP = Math.abs(MAX_JUMP_HEIGHT) * 0.75
// Maximum horizontal distance reachable during a jump
const JUMP_TIME = Math.abs(PHYSICS.JUMP_VELOCITY) / PHYSICS.GRAVITY * 2
const MAX_HORIZONTAL_REACH = PHYSICS.MOVE_SPEED * JUMP_TIME

function getZone(progress) {
  if (progress < 0.25) return 'easy'
  if (progress < 0.50) return 'medium'
  if (progress < 0.75) return 'hard'
  return 'extreme'
}

const ZONE_CONFIG = {
  easy: {
    minGap: 40, maxGap: 70,
    minWidth: 80, maxWidth: 110,
    normalChance: 0.80, movingChance: 0.05, fragileChance: 0.0, springChance: 0.15,
    movingSpeedMul: 0.4,
  },
  medium: {
    minGap: 55, maxGap: 90,
    minWidth: 62, maxWidth: 90,
    normalChance: 0.55, movingChance: 0.18, fragileChance: 0.12, springChance: 0.15,
    movingSpeedMul: 0.6,
  },
  hard: {
    minGap: 70, maxGap: 115,
    minWidth: 50, maxWidth: 75,
    normalChance: 0.35, movingChance: 0.25, fragileChance: 0.20, springChance: 0.20,
    movingSpeedMul: 0.85,
  },
  extreme: {
    minGap: 80, maxGap: 135,
    minWidth: 42, maxWidth: 60,
    normalChance: 0.25, movingChance: 0.28, fragileChance: 0.22, springChance: 0.25,
    movingSpeedMul: 1.1,
  },
}

function pickType(rng, zone) {
  const c = ZONE_CONFIG[zone]
  const roll = rng()
  let acc = c.springChance
  if (roll < acc) return 'spring'
  acc += c.movingChance
  if (roll < acc) return 'moving'
  acc += c.fragileChance
  if (roll < acc) return 'fragile'
  return 'normal'
}

// Reference count for difficulty progression — difficulty maxes out at "extreme"
// after this many platforms, then stays there forever.
const DIFFICULTY_RAMP_COUNT = 500

export function generatePlatforms(rng, count = 200) {
  const platforms = []
  let y = GAME_HEIGHT - 80

  // Starting platform — wide and centered
  platforms.push({
    x: GAME_WIDTH / 2 - 55,
    y,
    width: 110,
    type: 'normal',
    broken: false,
    movingDir: 0,
    movingSpeed: 0,
    originX: GAME_WIDTH / 2 - 55,
  })

  // Second platform — easy reach to get the player going
  y -= 65
  platforms.push({
    x: GAME_WIDTH / 2 - 40,
    y,
    width: 80,
    type: 'normal',
    broken: false,
    movingDir: 0,
    movingSpeed: 0,
    originX: GAME_WIDTH / 2 - 40,
  })

  _appendPlatforms(rng, platforms, count - 2, 2)
  return platforms
}

/**
 * Extend an existing platform array with more platforms.
 * Called dynamically when the player approaches the top of generated platforms.
 */
export function extendPlatforms(rng, platforms, count = 200) {
  const startIdx = platforms.length
  _appendPlatforms(rng, platforms, count, startIdx)
}

function _appendPlatforms(rng, platforms, count, globalStartIdx) {
  let y = platforms[platforms.length - 1].y
  let lastFragileStreak = 0

  // Check trailing fragile streak from existing platforms
  for (let j = Math.max(0, platforms.length - 3); j < platforms.length; j++) {
    if (platforms[j].type === 'fragile') lastFragileStreak++
    else lastFragileStreak = 0
  }

  for (let i = 0; i < count; i++) {
    const globalIdx = globalStartIdx + i
    const progress = Math.min(1, globalIdx / DIFFICULTY_RAMP_COUNT)
    const zone = getZone(progress)
    const cfg = ZONE_CONFIG[zone]

    // Vertical gap with slight randomness
    const gap = lerp(cfg.minGap, cfg.maxGap, rng())
    // Clamp to safe jump height so it's always reachable
    const clampedGap = Math.min(gap, SAFE_VERTICAL_GAP)
    y -= clampedGap

    // Platform width
    const width = lerp(cfg.maxWidth, cfg.minWidth, rng() * 0.6 + progress * 0.4)

    // X position — ensure horizontal reachability from previous platform
    const prev = platforms[platforms.length - 1]
    const prevCenterX = prev.x + prev.width / 2
    const maxHReach = MAX_HORIZONTAL_REACH * 0.7 // conservative

    // Zigzag bias: 65% chance to place platform on the opposite horizontal half.
    // This encourages lateral movement and prevents clustering on one side.
    let x
    if (rng() < 0.65) {
      const targetCenter = prevCenterX < GAME_WIDTH / 2
        ? GAME_WIDTH * 0.52 + rng() * GAME_WIDTH * 0.42   // bias toward right half
        : rng() * GAME_WIDTH * 0.48                         // bias toward left half
      x = Math.max(0, Math.min(GAME_WIDTH - width, targetCenter - width / 2))
    } else {
      x = rng() * (GAME_WIDTH - width)
    }

    // Check if the new platform center is within horizontal reach
    const newCenterX = x + width / 2
    const hDist = Math.abs(newCenterX - prevCenterX)
    if (hDist > maxHReach) {
      // Pull it closer — place within reach
      const dir = newCenterX > prevCenterX ? 1 : -1
      x = prevCenterX + dir * maxHReach * (0.4 + rng() * 0.5) - width / 2
      x = Math.max(0, Math.min(GAME_WIDTH - width, x))
    }

    // Type selection with rules
    let type = pickType(rng, zone)

    // Don't allow more than 1 fragile in easy, 2 elsewhere
    const fragileLimit = zone === 'easy' ? 1 : 2
    if (type === 'fragile') {
      lastFragileStreak++
      if (lastFragileStreak > fragileLimit) {
        type = rng() < 0.5 ? 'normal' : 'spring'
        lastFragileStreak = 0
      }
    } else {
      lastFragileStreak = 0
    }

    // Every 8 platforms in hard/extreme, force a wide safe "relief" platform
    const localIdx = globalStartIdx + i
    if ((zone === 'hard' || zone === 'extreme') && localIdx % 8 === 0) {
      type = rng() < 0.3 ? 'spring' : 'normal'
      // Override with a wider, easier-to-reach platform
      const reliefWidth = lerp(cfg.maxWidth, cfg.maxWidth + 25, rng())
      platforms.push({
        x: Math.max(0, Math.min(GAME_WIDTH - reliefWidth, x)),
        y,
        width: reliefWidth,
        type,
        broken: false,
        movingDir: 0,
        movingSpeed: 0,
        originX: x,
      })
      lastFragileStreak = 0
      continue
    }

    // After a spring, next platform should be reachable from spring height
    // (springs launch much higher, so the next gap can be bigger)
    if (prev.type === 'spring') {
      const springMaxH = (PHYSICS.SPRING_VELOCITY * PHYSICS.SPRING_VELOCITY) / (2 * PHYSICS.GRAVITY) * 0.6
      const extraGap = rng() * springMaxH * 0.3
      y -= extraGap
    }

    // Moving platform speed
    const movingSpeed = type === 'moving'
      ? lerp(PLATFORM.MOVING_SPEED_MIN, PLATFORM.MOVING_SPEED_MAX, progress) * cfg.movingSpeedMul
      : 0

    platforms.push({
      x,
      y,
      width,
      type,
      broken: false,
      movingDir: movingSpeed > 0 ? (rng() > 0.5 ? 1 : -1) : 0,
      movingSpeed: Math.abs(movingSpeed),
      originX: x,
    })
  }
}
