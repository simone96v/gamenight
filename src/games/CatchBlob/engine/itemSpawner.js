import { GAME_WIDTH, ITEM, BASKET, getWaveForElapsed } from './physics'

const IN_FLIGHT_EST_SEC = 4.0
const REACH_FACTOR = 0.6

// Within the malus pool, bombs are more common than skulls (60/40).
const BOMB_VS_SKULL = 0.6

function pickKind(rng, wave) {
  const r = rng()
  if (r < wave.malusRate) {
    return rng() < BOMB_VS_SKULL ? 'bomb' : 'skull'
  }
  if (r < wave.malusRate + wave.starRate) return 'star'
  return 'right'
}

/**
 * Spawn one item. `state` keeps inter-spawn memory for fair positioning:
 *   state.lastRightSpawn = { x, t } | null
 *
 * Guarantee: two consecutive right blobs in flight at the same time
 * are placed so the basket can physically reach both.
 */
export function spawnItem(rng, elapsed, playerColor, state = {}) {
  const wave = getWaveForElapsed(elapsed)
  const kind = pickKind(rng, wave)
  const margin = ITEM.RADIUS + 6

  let x
  if (kind === 'right' && state.lastRightSpawn) {
    const dt = elapsed - state.lastRightSpawn.t
    if (dt > 0 && dt < IN_FLIGHT_EST_SEC) {
      const maxDx = BASKET.MOVE_SPEED * dt * REACH_FACTOR
      const lastX = state.lastRightSpawn.x
      const lo = Math.max(margin, lastX - maxDx)
      const hi = Math.min(GAME_WIDTH - margin, lastX + maxDx)
      x = lo + rng() * Math.max(0, hi - lo)
    } else {
      x = margin + rng() * (GAME_WIDTH - margin * 2)
    }
  } else {
    x = margin + rng() * (GAME_WIDTH - margin * 2)
  }

  const vy0 = ITEM.BASE_FALL_SPEED * wave.fallSpeedMul
  const color = kind === 'right' ? playerColor : null

  if (kind === 'right') {
    state.lastRightSpawn = { x, t: elapsed }
  }

  return {
    kind,
    x,
    y: -ITEM.RADIUS - 4,
    vy: vy0,
    rot: (rng() - 0.5) * 0.6,
    rotSpeed: (rng() - 0.5) * 1.2,
    color,
    born: elapsed,
    settled: false,
  }
}

/** Spawn cadence (seconds between spawns) for the current wave. */
export function currentSpawnInterval(elapsed) {
  return getWaveForElapsed(elapsed).spawnInterval
}
