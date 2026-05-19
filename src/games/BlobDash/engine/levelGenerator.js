// Chunk-based level generator per Blob Dash.
//
// Un "chunk" è una sequenza fissa di ostacoli (spike/block/pit) lunga `units`
// tile (1 tile = TILE px). Il generator estrae chunk dal pool pesando per
// difficoltà, separa con un rest gap, e accumula world-x.
//
// Difficoltà cresce con la distanza percorsa. Ogni chunk ha un livello 1-5.

import { GAME_WIDTH, GROUND_Y, TILE, OBSTACLE, PHYSICS, lerp } from './physics.js'

// Quanto in alto può saltare il blob (in px). Serve per validare pile di block.
const MAX_JUMP_HEIGHT = (PHYSICS.JUMP_VELOCITY * PHYSICS.JUMP_VELOCITY) / (2 * PHYSICS.GRAVITY)
// Block alti al massimo (jump_height - blob_radius - safety) tile.
// Con jump 91px: blocchi h=2 (80px) sono al limite, h=1 facili.
const MAX_BLOCK_STACK_H = Math.max(1, Math.floor((Math.abs(MAX_JUMP_HEIGHT) - PHYSICS.BLOB_RADIUS - 2) / TILE))

const RUNWAY_PX = GAME_WIDTH * 1.4

// ── Chunk templates ────────────────────────────────────────
// `items`: lista ordinata di ostacoli con dx (in tile) dall'inizio del chunk
//          e i parametri specifici per tipo.
// `units`: lunghezza totale del chunk in tile (include trailing space).
// `diff`:  livello di difficoltà (1=easy, 5=extreme).

// Air distance @ SCROLL_SPEED_START ≈ 5 tile. Cluster spike progettati per
// stare TUTTI dentro un singolo salto (max 4 tile di larghezza). Ostacoli
// composti hanno gap > air_distance così c'è un atterraggio safe in mezzo.
const CHUNKS = [
  // ─── Easy (1-2) ─────────────────────────────────────
  {
    id: 'breather',
    diff: 1,
    units: 5,
    items: [],
  },
  {
    id: 'single_spike',
    diff: 1,
    units: 6,
    items: [{ type: 'spike', dx: 3 }],
  },
  {
    id: 'block_single_low',
    diff: 2,
    units: 7,
    items: [{ type: 'block', dx: 3, h: 1 }],
  },
  {
    id: 'twin_spike_tight',
    diff: 2,
    units: 7,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 3 },
    ],
  },

  // ─── Medium (3) ─────────────────────────────────────
  {
    // Spike singolo + altro spike DOPO un atterraggio sicuro.
    // Gap 7 tile: a vel media il blob atterra a ~5 tile dal jump start,
    // quindi resta ~2 tile di reazione prima del secondo spike.
    id: 'spike_then_spike',
    diff: 3,
    units: 12,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 9 },
    ],
  },
  {
    id: 'triple_spike_tight',
    diff: 3,
    units: 8,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 3 },
      { type: 'spike', dx: 4 },
    ],
  },
  {
    id: 'pit_short',
    diff: 3,
    units: 8,
    items: [{ type: 'pit', dx: 3, w: 2 }],
  },
  {
    // Block low che fa da piattaforma, atterri sopra, ricadi.
    id: 'block_island',
    diff: 3,
    units: 9,
    items: [{ type: 'block', dx: 3, h: 1 }],
  },

  // ─── Hard (4) ───────────────────────────────────────
  {
    // Cluster di 4 spike adiacenti: sorvolato in un solo salto.
    id: 'quad_spike_tight',
    diff: 4,
    units: 10,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 3 },
      { type: 'spike', dx: 4 },
      { type: 'spike', dx: 5 },
    ],
  },
  {
    // Due pit corti distanziati: salta, atterra, ri-salta.
    id: 'twin_pit_far',
    diff: 4,
    units: 14,
    items: [
      { type: 'pit', dx: 2, w: 2 },
      { type: 'pit', dx: 9, w: 2 },
    ],
  },
  {
    // Pit corto seguito da spike singolo dopo zona safe.
    id: 'pit_then_spike',
    diff: 4,
    units: 14,
    items: [
      { type: 'pit', dx: 2, w: 2 },
      { type: 'spike', dx: 11 },
    ],
  },
  {
    // Pad + spike field: vola alto, atterri DOPO la zona pericolosa.
    id: 'pad_over_spike_field',
    diff: 4,
    units: 14,
    items: [
      { type: 'pad', dx: 2 },
      { type: 'spike', dx: 5 },
      { type: 'spike', dx: 6 },
      { type: 'spike', dx: 7 },
    ],
  },

  // ─── Extreme (5) ───────────────────────────────────
  {
    id: 'pit_wide',
    diff: 5,
    units: 11,
    items: [{ type: 'pit', dx: 3, w: 3 }],
  },
  {
    id: 'penta_spike_tight',
    diff: 5,
    units: 11,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 3 },
      { type: 'spike', dx: 4 },
      { type: 'spike', dx: 5 },
      { type: 'spike', dx: 6 },
    ],
  },
  {
    // Pad + pit largo: senza pad sei morto, il pad ti spara oltre.
    id: 'pad_over_pit',
    diff: 5,
    units: 14,
    items: [
      { type: 'pad', dx: 2 },
      { type: 'pit', dx: 5, w: 4 },
    ],
  },
  {
    // Spike isolato seguito da cluster di 3: hard timing.
    id: 'spike_then_triple',
    diff: 5,
    units: 16,
    items: [
      { type: 'spike', dx: 2 },
      { type: 'spike', dx: 10 },
      { type: 'spike', dx: 11 },
      { type: 'spike', dx: 12 },
    ],
  },
]

function getZoneMaxDiff(progress) {
  if (progress < 0.20) return 2  // easy
  if (progress < 0.45) return 3  // medium
  if (progress < 0.70) return 4  // hard
  return 5                        // extreme
}

function pickChunk(rng, progress) {
  const maxDiff = getZoneMaxDiff(progress)
  // Bias: nelle zone alte includiamo anche i chunk facili come "respiro",
  // ma con peso ridotto.
  const eligible = CHUNKS.filter((c) => c.diff <= maxDiff)
  // Peso: chunk più vicini alla difficoltà max = più probabili.
  const weights = eligible.map((c) => {
    const dist = maxDiff - c.diff
    return Math.max(0.15, 1 - dist * 0.30)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return eligible[i]
  }
  return eligible[eligible.length - 1]
}

// Rest gap fra chunk: cresce con la difficoltà. A vel alta il blob copre
// più tile in un salto, quindi serve più "respiro" tra chunk per evitare
// che il blob atterri dentro il chunk successivo.
//
// Extra gap quando il chunk PRECEDENTE termina con pit/spike e il successivo
// comincia con pit/spike: si rischia di atterrare dentro il prossimo ostacolo.
function pickRestGap(rng, progress, prevTail, nextHead) {
  const minTiles = lerp(2, 4, progress)
  const maxTiles = lerp(4, 7, progress)
  let gap = Math.round(lerp(minTiles, maxTiles, rng()))
  const tailDanger = prevTail === 'spike' || prevTail === 'pit'
  const headDanger = nextHead === 'spike' || nextHead === 'pit'
  if (tailDanger && headDanger) gap = Math.max(gap, Math.round(lerp(4, 8, progress)))
  return gap
}

// Helper: tipo dell'ultimo ostacolo di un chunk (per il decision sul gap).
function chunkTailType(chunk) {
  if (chunk.items.length === 0) return null
  return chunk.items[chunk.items.length - 1].type
}
function chunkHeadType(chunk) {
  if (chunk.items.length === 0) return null
  return chunk.items[0].type
}

/**
 * Espande un chunk template in obstacles concreti con world-x.
 * Ritorna: lo world-x di fine chunk.
 */
function expandChunk(chunk, baseX, obstacles) {
  for (const item of chunk.items) {
    const x = baseX + item.dx * TILE
    if (item.type === 'spike') {
      obstacles.push({
        type: 'spike',
        x,
        y: GROUND_Y,
        w: OBSTACLE.SPIKE_W,
        h: OBSTACLE.SPIKE_H,
      })
    } else if (item.type === 'block') {
      const h = Math.min(item.h, MAX_BLOCK_STACK_H)
      obstacles.push({
        type: 'block',
        x,
        y: GROUND_Y - h * OBSTACLE.BLOCK_H, // top del block
        w: OBSTACLE.BLOCK_W,
        h: h * OBSTACLE.BLOCK_H,
      })
    } else if (item.type === 'pit') {
      obstacles.push({
        type: 'pit',
        x,
        y: GROUND_Y,
        w: item.w * TILE,
        h: 0,
      })
    } else if (item.type === 'pad') {
      obstacles.push({
        type: 'pad',
        x,
        y: GROUND_Y,
        w: OBSTACLE.PAD_W,
        h: OBSTACLE.PAD_H,
        triggered: false,
      })
    }
  }
  return baseX + chunk.units * TILE
}

export function generateObstacles(rng, count = 30) {
  const obstacles = []
  let x = RUNWAY_PX
  let prevTail = null
  for (let i = 0; i < count; i++) {
    const progress = Math.min(1, i / 50)
    const chunk = pickChunk(rng, progress)
    const headType = chunkHeadType(chunk)
    x += pickRestGap(rng, progress, prevTail, headType) * TILE  // gap PRIMA del chunk
    x = expandChunk(chunk, x, obstacles)
    prevTail = chunkTailType(chunk)
  }
  obstacles._tailX = x
  obstacles._tailType = prevTail
  obstacles._chunkCount = count
  return obstacles
}

export function extendObstacles(rng, obstacles, count = 30) {
  let x = obstacles._tailX != null
    ? obstacles._tailX
    : (obstacles.length > 0 ? obstacles[obstacles.length - 1].x + 200 : RUNWAY_PX)
  const baseChunkIdx = obstacles._chunkCount ?? Math.floor(obstacles.length / 2)
  let prevTail = obstacles._tailType ?? null
  for (let i = 0; i < count; i++) {
    const progress = Math.min(1, (baseChunkIdx + i) / 50)
    const chunk = pickChunk(rng, progress)
    const headType = chunkHeadType(chunk)
    x += pickRestGap(rng, progress, prevTail, headType) * TILE
    x = expandChunk(chunk, x, obstacles)
    prevTail = chunkTailType(chunk)
  }
  obstacles._tailX = x
  obstacles._tailType = prevTail
  obstacles._chunkCount = baseChunkIdx + count
}
