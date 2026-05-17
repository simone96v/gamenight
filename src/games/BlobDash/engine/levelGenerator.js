// Genera ostacoli su una griglia di "beat slot" deterministicamente da un seed.
// Ogni slot ha larghezza BEAT.DIST. La difficoltà sale a fasce in base a worldX.

import { BEAT, OBSTACLE } from './physics'

// Difficulty bands per distanza percorsa (px-mondo).
// `empty` = probabilità che lo slot resti vuoto.
// `weights` = pesi normalizzati per tipo di ostacolo (sommano a 1).
const BANDS = [
  { maxDist: 6000,     empty: 0.78, weights: { spike: 0.92, spike3: 0.06, block: 0.02 } },
  { maxDist: 12000,    empty: 0.60, weights: { spike: 0.70, spike3: 0.18, block: 0.12 } },
  { maxDist: Infinity, empty: 0.48, weights: { spike: 0.55, spike3: 0.25, block: 0.20 } },
]

function pickBand(worldX) {
  for (const b of BANDS) if (worldX < b.maxDist) return b
  return BANDS[BANDS.length - 1]
}

function pickType(rng, weights) {
  const r = rng()
  let acc = 0
  for (const [type, w] of Object.entries(weights)) {
    acc += w
    if (r < acc) return type
  }
  return Object.keys(weights)[0]
}

/**
 * Genera ostacoli per gli slot [fromSlot, toSlot).
 * Ritorna array ordinato per worldX crescente.
 * Lo stato del `rng` viene consumato in modo deterministico per slot.
 */
export function generateObstacles(rng, fromSlot, toSlot) {
  const out = []
  let slot = fromSlot
  // Forza almeno BEAT.MIN_GAP_SLOTS slot vuoti dopo l'ultimo ostacolo.
  let lastObstacleEndSlot = fromSlot - BEAT.MIN_GAP_SLOTS - 1

  while (slot < toSlot) {
    const slotWorldX = BEAT.START_OFFSET + slot * BEAT.DIST
    const band = pickBand(slotWorldX)

    // Gap obbligatorio dopo un ostacolo: l'rng NON viene consumato qui
    // perché altrimenti la sequenza cambierebbe in base a ostacoli precedenti.
    if (slot - lastObstacleEndSlot <= BEAT.MIN_GAP_SLOTS) {
      slot++
      continue
    }

    const rEmpty = rng()
    if (rEmpty < band.empty) {
      slot++
      continue
    }

    const type = pickType(rng, band.weights)
    const meta = OBSTACLE[type]
    const slotRegionWidth = meta.slots * BEAT.DIST
    const xOffset = (slotRegionWidth - meta.width) / 2

    out.push({
      slot,
      type,
      worldX: slotWorldX + xOffset,
      width: meta.width,
      height: meta.height,
    })

    lastObstacleEndSlot = slot + meta.slots - 1
    slot += meta.slots
  }
  return out
}
