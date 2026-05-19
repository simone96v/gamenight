import { GAME_WIDTH, GAME_HEIGHT, PIPE, GROUND, clamp } from './physics'

/**
 * Pipe layout: an array of pipe pairs ordered by ascending `x`.
 * Each pipe has:
 *   x          — left edge in world coordinates (decreases over time)
 *   gapY       — vertical center of the gap
 *   gapH       — gap height (between top pipe bottom and bottom pipe top)
 *   width      — pipe width
 *   passed     — flag set when blob clears it (for scoring)
 *   index      — sequential index (for difficulty ramp)
 */

function makePipe(rng, index, prevX, prevGapY) {
  const decay = Math.min(0.8, index * PIPE.GAP_DECAY)
  const gapRange = PIPE.GAP_MAX - PIPE.GAP_MIN
  const gapH = PIPE.GAP_MAX - decay * gapRange

  const minCenter = PIPE.MARGIN_TOP + gapH / 2
  const maxCenter = GAME_HEIGHT - GROUND.HEIGHT - PIPE.MARGIN_BOTTOM - gapH / 2

  // Clamp vertical delta from previous pipe so transitions stay physically passable.
  let rangeLo = minCenter
  let rangeHi = maxCenter
  if (typeof prevGapY === 'number') {
    rangeLo = Math.max(minCenter, prevGapY - PIPE.MAX_GAP_DELTA)
    rangeHi = Math.min(maxCenter, prevGapY + PIPE.MAX_GAP_DELTA)
    if (rangeHi < rangeLo) {
      const mid = (rangeLo + rangeHi) / 2
      rangeLo = mid
      rangeHi = mid
    }
  }
  const gapY = rangeLo + rng() * Math.max(0, rangeHi - rangeLo)

  const spacingDecay = Math.min(1, index * 0.05)
  const spacing = PIPE.SPACING_START - spacingDecay * (PIPE.SPACING_START - PIPE.SPACING_MIN)

  return {
    x: prevX + spacing,
    gapY,
    gapH,
    width: PIPE.WIDTH,
    passed: false,
    index,
  }
}

export function generatePipes(rng, count, firstX = GAME_WIDTH + 60) {
  const pipes = []
  let prevX = firstX - PIPE.SPACING_START
  let prevGapY
  for (let i = 0; i < count; i++) {
    const p = makePipe(rng, i, prevX, prevGapY)
    pipes.push(p)
    prevX = p.x
    prevGapY = p.gapY
  }
  return pipes
}

export function extendPipes(rng, pipes, count) {
  if (!pipes.length) return generatePipes(rng, count)
  const last = pipes[pipes.length - 1]
  let prevX = last.x
  let prevGapY = last.gapY
  let startIdx = last.index + 1
  for (let i = 0; i < count; i++) {
    const p = makePipe(rng, startIdx + i, prevX, prevGapY)
    pipes.push(p)
    prevX = p.x
    prevGapY = p.gapY
  }
  return pipes
}

export function currentSpeed(score) {
  return clamp(
    PIPE.SPEED_START + score * PIPE.SPEED_RAMP_PER_PIPE,
    PIPE.SPEED_START,
    PIPE.SPEED_MAX,
  )
}
