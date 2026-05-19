// Bot simulatore per Blob Dash — esegue una run frame-by-frame senza render,
// usando un "smart agent" che decide quando saltare in base agli ostacoli
// imminenti. Riusa esattamente generator + physics del gioco.
//
// Run: node scripts/blobdash-bot.mjs [maxSeconds] [seedCount]

import { createRNG } from '../src/games/BlobDash/engine/rng.js'
import { generateObstacles, extendObstacles } from '../src/games/BlobDash/engine/levelGenerator.js'
import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_Y, BLOB_X, PHYSICS,
} from '../src/games/BlobDash/engine/physics.js'

const DT = 1 / 60
const SHRINK = PHYSICS.HITBOX_SHRINK
const AIR_TIME = 2 * Math.abs(PHYSICS.JUMP_VELOCITY) / PHYSICS.GRAVITY
const JUMP_HEIGHT = Math.abs(PHYSICS.JUMP_VELOCITY) ** 2 / (2 * PHYSICS.GRAVITY)

function newBlob() {
  return { y: GROUND_Y - PHYSICS.BLOB_RADIUS, vy: 0, onGround: true }
}

// ── Helper identici all'engine ─────────────────────────────
function computeFloor(blobWorldX, obstacles, startIdx) {
  let floorY = GROUND_Y
  let onPit = false
  for (let i = startIdx; i < obstacles.length; i++) {
    const o = obstacles[i]
    if (o.x > blobWorldX + 5) break
    if (o.x + o.w < blobWorldX - 5) continue
    if (o.type === 'pit') {
      if (blobWorldX >= o.x && blobWorldX <= o.x + o.w) onPit = true
    } else if (o.type === 'block') {
      if (blobWorldX >= o.x && blobWorldX <= o.x + o.w) {
        if (o.y < floorY) floorY = o.y
      }
    }
  }
  if (onPit && floorY === GROUND_Y) return Infinity
  return floorY
}

function checkBlockFrontHit(blobWorldX, blob, obstacles, startIdx) {
  const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * SHRINK
  const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * SHRINK
  const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * SHRINK
  const LAND_TOL = 14
  for (let i = startIdx; i < obstacles.length; i++) {
    const o = obstacles[i]
    if (o.x - blobWorldX > 80) break
    if (o.type !== 'block') continue
    const blockTop = o.y
    const blockBottom = o.y + o.h
    const overlapX = blobRight >= o.x && blobLeft <= o.x + o.w
    if (!overlapX) continue
    if (blobBottom > blockTop + LAND_TOL && blob.y < blockBottom) return true
  }
  return false
}

function obstacleSummary(obstacles, idx, radius) {
  const start = Math.max(0, idx - radius)
  const end = Math.min(obstacles.length, idx + radius + 1)
  const items = []
  for (let i = start; i < end; i++) {
    const o = obstacles[i]
    const mark = i === idx ? '*' : ' '
    items.push(`${mark}${o.type}@${o.x.toFixed(0)}${o.h ? `h=${o.h.toFixed(0)}` : ''}${o.w !== 40 ? `w=${o.w}` : ''}`)
  }
  return items.join('  ')
}

function spikeHit(blob, blobWorldX, o) {
  const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * SHRINK
  const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * SHRINK
  const blobTop = blob.y - PHYSICS.BLOB_RADIUS * SHRINK
  const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * SHRINK
  const spikeLeft = o.x + o.w * 0.18
  const spikeRight = o.x + o.w * 0.82
  const spikeTop = o.y - o.h
  const spikeBottom = o.y - o.h * 0.10
  return (
    blobRight >= spikeLeft &&
    blobLeft <= spikeRight &&
    blobBottom >= spikeTop &&
    blobTop <= spikeBottom
  )
}

// ── Agent ──────────────────────────────────────────────
function shouldJump(blob, cameraX, scrollSpeed, obstacles, startIdx) {
  if (!blob.onGround) return false
  const blobWorldX = cameraX + BLOB_X
  const airDist = AIR_TIME * scrollSpeed

  // Trova il prossimo ostacolo "azione richiesta".
  let targetIdx = -1
  for (let i = startIdx; i < obstacles.length; i++) {
    const o = obstacles[i]
    if (o.x + o.w < blobWorldX - 5) continue
    if (o.type === 'pad') continue
    targetIdx = i
    break
  }
  if (targetIdx < 0) return false
  const o = obstacles[targetIdx]
  const dx = o.x - blobWorldX
  if (dx > airDist * 1.6) return false

  if (o.type === 'spike') {
    // Cluster: spike adiacenti che possiamo coprire con un singolo salto.
    let clusterEndRight = o.x + o.w
    for (let j = targetIdx + 1; j < obstacles.length; j++) {
      const n = obstacles[j]
      if (n.type !== 'spike') break
      if (n.x - clusterEndRight > airDist * 0.45) break
      clusterEndRight = n.x + n.w
    }
    const clusterLeft = o.x + o.w * 0.18
    const clusterRight = clusterEndRight - o.w * 0.18
    const apexTargetX = (clusterLeft + clusterRight) / 2
    const tToApex = (apexTargetX - blobWorldX) / scrollSpeed
    // Salta quando l'apex coincide con il centro del cluster.
    if (tToApex > 0 && tToApex <= AIR_TIME * 0.5 + DT) return true
    return false
  }

  if (o.type === 'pit') {
    const tToEdge = (o.x - blobWorldX) / scrollSpeed
    const landingX = blobWorldX + airDist
    const margin = 10
    if (tToEdge >= 0 && landingX > o.x + o.w + margin && tToEdge < AIR_TIME * 0.6) return true
    return false
  }

  if (o.type === 'block') {
    const tToHit = (o.x - (blobWorldX + PHYSICS.BLOB_RADIUS * SHRINK)) / scrollSpeed
    if (tToHit > 0 && tToHit <= AIR_TIME * 0.5 + DT) return true
    return false
  }
  return false
}

// ── Simulazione ─────────────────────────────────────────────
function simulate(seed, maxSeconds = 60, noiseMs = 0) {
  const rng = createRNG(seed)
  const obstacles = generateObstacles(rng, 60)

  const blob = newBlob()
  let cameraX = 0
  let scrollSpeed = PHYSICS.SCROLL_SPEED_START
  let distance = 0
  let visibleStartIdx = 0
  let died = null
  let elapsed = 0
  // Human noise: pending jump delay accumulator + jitter on each decision.
  let pendingJumpDelay = -1
  // Stessa rng del livello per riproducibilità — separata da rng-stream.
  const humanRng = createRNG(seed ^ 0xDEADBEEF)

  while (elapsed < maxSeconds) {
    const lastObs = obstacles[obstacles.length - 1]
    if (lastObs && lastObs.x - cameraX < GAME_WIDTH * 4) {
      extendObstacles(rng, obstacles, 60)
    }

    const wantJump = shouldJump(blob, cameraX, scrollSpeed, obstacles, visibleStartIdx)
    if (noiseMs > 0) {
      // Modello umano: quando l'agent VUOLE saltare, parte un delay random
      // ±noise. Se il delay scade e siamo ancora onGround, salto.
      if (wantJump && blob.onGround && pendingJumpDelay < 0) {
        pendingJumpDelay = (humanRng() * 2 - 1) * noiseMs / 1000
        if (pendingJumpDelay < 0) pendingJumpDelay = 0 // anticipa = salta subito
      }
      if (pendingJumpDelay >= 0) {
        pendingJumpDelay -= DT
        if (pendingJumpDelay <= 0 && blob.onGround) {
          blob.vy = PHYSICS.JUMP_VELOCITY
          blob.onGround = false
          pendingJumpDelay = -1
        } else if (!blob.onGround) {
          pendingJumpDelay = -1
        }
      }
    } else if (wantJump && blob.onGround) {
      blob.vy = PHYSICS.JUMP_VELOCITY
      blob.onGround = false
    }

    blob.vy += PHYSICS.GRAVITY * DT
    if (blob.vy > PHYSICS.MAX_FALL_SPEED) blob.vy = PHYSICS.MAX_FALL_SPEED
    const prevY = blob.y
    blob.y += blob.vy * DT

    cameraX += scrollSpeed * DT
    const blobWorldX = cameraX + BLOB_X

    if (checkBlockFrontHit(blobWorldX, blob, obstacles, visibleStartIdx)) {
      died = { type: 'block_front', distance: cameraX / PHYSICS.PIXELS_PER_METER }
      break
    }

    // Pad trigger.
    for (let i = visibleStartIdx; i < obstacles.length; i++) {
      const o = obstacles[i]
      if (o.x > blobWorldX + 80) break
      if (o.type !== 'pad' || o.triggered) continue
      const padTop = o.y - o.h
      const blobLeft = blobWorldX - PHYSICS.BLOB_RADIUS * SHRINK
      const blobRight = blobWorldX + PHYSICS.BLOB_RADIUS * SHRINK
      const blobBottom = blob.y + PHYSICS.BLOB_RADIUS * SHRINK
      const overlapX = blobRight >= o.x && blobLeft <= o.x + o.w
      if (overlapX && blobBottom >= padTop - 4 && blob.vy >= 0) {
        o.triggered = true
        blob.vy = PHYSICS.PAD_VELOCITY
        blob.onGround = false
      }
    }

    const floorY = computeFloor(blobWorldX, obstacles, visibleStartIdx)
    const floorLine = floorY - PHYSICS.BLOB_RADIUS
    if (blob.vy >= 0 && prevY <= floorLine + 1 && blob.y >= floorLine) {
      blob.y = floorLine
      blob.vy = 0
      blob.onGround = true
    } else {
      blob.onGround = false
    }

    if (blob.y > GAME_HEIGHT + 60) {
      died = { type: 'pit_fall', distance: cameraX / PHYSICS.PIXELS_PER_METER }
      break
    }

    for (let i = visibleStartIdx; i < obstacles.length; i++) {
      const o = obstacles[i]
      if (o.x - cameraX > GAME_WIDTH + 50) break
      if (o.type !== 'spike') continue
      if (spikeHit(blob, blobWorldX, o)) {
        died = {
          type: 'spike',
          distance: cameraX / PHYSICS.PIXELS_PER_METER,
          atObstacleIdx: i,
          blobY: blob.y,
          blobVy: blob.vy,
          surroundings: obstacleSummary(obstacles, i, 4),
        }
        break
      }
    }
    if (died) break

    while (visibleStartIdx < obstacles.length - 1) {
      const o = obstacles[visibleStartIdx]
      if (o.x + o.w - cameraX > -50) break
      visibleStartIdx++
    }

    distance = cameraX / PHYSICS.PIXELS_PER_METER
    scrollSpeed = Math.min(
      PHYSICS.SCROLL_SPEED_MAX,
      PHYSICS.SCROLL_SPEED_START + distance * PHYSICS.SCROLL_SPEED_RAMP_PER_METER,
    )

    elapsed += DT
  }

  return {
    seed,
    distance: Math.floor(distance),
    died,
    elapsed,
  }
}

// ── Main ────────────────────────────────────────────────
const args = process.argv.slice(2)
const maxSec = parseInt(args[0] || '60', 10)
const seedCount = parseInt(args[1] || '20', 10)
const noiseMs = parseInt(args[2] || '0', 10)

console.log(`Blob Dash bot — jump_h=${JUMP_HEIGHT.toFixed(1)}px, air_t=${AIR_TIME.toFixed(3)}s, scroll ${PHYSICS.SCROLL_SPEED_START}-${PHYSICS.SCROLL_SPEED_MAX}`)
console.log(`Air dist @ start = ${(AIR_TIME * PHYSICS.SCROLL_SPEED_START).toFixed(0)}px (${(AIR_TIME * PHYSICS.SCROLL_SPEED_START / 40).toFixed(2)} tile)`)
console.log(`Air dist @ max   = ${(AIR_TIME * PHYSICS.SCROLL_SPEED_MAX).toFixed(0)}px (${(AIR_TIME * PHYSICS.SCROLL_SPEED_MAX / 40).toFixed(2)} tile)`)
console.log(`Running ${seedCount} seeds, max ${maxSec}s each, human-noise=${noiseMs}ms...\n`)

const results = []
for (let i = 0; i < seedCount; i++) {
  const seed = 1000 + i * 7919
  const r = simulate(seed, maxSec, noiseMs)
  results.push(r)
  const status = r.died ? `DIED at ${r.distance}m (${r.died.type})` : `SURVIVED ${r.distance}m`
  console.log(`seed=${seed.toString().padStart(7)}  ${status}`)
}

const survived = results.filter((r) => !r.died).length
const avgDist = results.reduce((a, r) => a + r.distance, 0) / results.length
const deathTypes = {}
for (const r of results) {
  if (r.died) deathTypes[r.died.type] = (deathTypes[r.died.type] || 0) + 1
}

console.log(`\n── Summary ──`)
console.log(`Survived ${survived}/${seedCount} (${(survived / seedCount * 100).toFixed(0)}%)`)
console.log(`Avg distance: ${avgDist.toFixed(0)}m`)
console.log(`Deaths by type:`, deathTypes)

console.log(`\n── Death details (first 5) ──`)
for (const r of results.slice(0, 5)) {
  if (!r.died) continue
  console.log(`seed ${r.seed} @ ${r.distance}m  ${r.died.type}`)
  if (r.died.surroundings) console.log(`  ${r.died.surroundings}`)
  if (r.died.blobY != null) console.log(`  blob y=${r.died.blobY.toFixed(1)} vy=${r.died.blobVy.toFixed(1)}`)
}
