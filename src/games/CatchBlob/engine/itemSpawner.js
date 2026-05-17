import { GAME_WIDTH, ITEM, ITEM_WEIGHTS, SPAWN } from './physics'
import { AVATAR_COLORS } from '../../../utils/colors'

/**
 * Pick item kind from weighted distribution.
 * Bomb weight grows slightly with elapsed time for added pressure.
 */
function pickKind(rng, elapsed) {
  // Boost bomb up to +3% by 60s
  const bombBoost = Math.min(0.03, elapsed * 0.0005)
  const w = {
    right: ITEM_WEIGHTS.right,
    wrong: ITEM_WEIGHTS.wrong - bombBoost,
    bomb:  ITEM_WEIGHTS.bomb + bombBoost,
    star:  ITEM_WEIGHTS.star,
  }
  const total = w.right + w.wrong + w.bomb + w.star
  const r = rng() * total
  if (r < w.right) return 'right'
  if (r < w.right + w.wrong) return 'wrong'
  if (r < w.right + w.wrong + w.bomb) return 'bomb'
  return 'star'
}

/**
 * For a "wrong" blob, pick a color different from the player's.
 * Uses RNG so the choice is deterministic per spawn.
 */
function pickWrongColor(rng, playerColor) {
  const others = AVATAR_COLORS.filter((c) => c !== playerColor)
  return others[Math.floor(rng() * others.length)]
}

/**
 * Spawn one item. Returns an object the engine pushes into its item list.
 * Color decided client-side based on player color, but kind/x come from seeded RNG.
 */
export function spawnItem(rng, elapsed, playerColor) {
  const kind = pickKind(rng, elapsed)
  const margin = ITEM.RADIUS + 6
  const x = margin + rng() * (GAME_WIDTH - margin * 2)
  const speedMul = Math.min(ITEM.SPEED_RAMP_CAP, 1 + elapsed * ITEM.SPEED_RAMP_PER_SEC)
  const vy0 = ITEM.BASE_FALL_SPEED * speedMul

  let color = null
  if (kind === 'right') color = playerColor
  else if (kind === 'wrong') color = pickWrongColor(rng, playerColor)

  return {
    kind,
    x,
    y: -ITEM.RADIUS - 4,
    vy: vy0,
    rot: (rng() - 0.5) * 0.6,
    rotSpeed: (rng() - 0.5) * 1.2,
    color,
    born: elapsed,
    settled: false, // becomes true once caught or missed
  }
}

/**
 * Current spawn interval (seconds) — eases from START_INTERVAL → MIN_INTERVAL over RAMP_SECONDS.
 */
export function currentSpawnInterval(elapsed) {
  const t = Math.min(1, elapsed / SPAWN.RAMP_SECONDS)
  // Ease-out so early game has more breathing room
  const eased = 1 - Math.pow(1 - t, 2)
  return SPAWN.START_INTERVAL + (SPAWN.MIN_INTERVAL - SPAWN.START_INTERVAL) * eased
}
