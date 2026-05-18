// Generatore procedurale del pozzo. Solo 2 colonne (sx/dx rispetto al blob):
// il blob può scegliere `LEFT` o `RIGHT` ad ogni discesa. Ogni cella è un
// CellType. Garantiamo SEMPRE che almeno una delle due celle sotto sia
// scavabile (= non lava) così il gioco non softlocka mai.

export const CELL = {
  DIRT:    'dirt',
  GEM:     'gem',
  TREASURE:'treasure', // tesoro raro = +50
  LAVA:    'lava',
}

// Probabilità base e scaling con la profondità.
// pLava cresce piano (rampa morbida verso ~40% asintoticamente).
function probsAt(depth) {
  const ramp = Math.min(1, depth / 200)        // 0..1 in 200 metri
  const pLava     = 0.10 + 0.30 * ramp         // 10% → 40%
  const pGem      = 0.08 + 0.04 * ramp         // 8% → 12%
  const pTreasure = 0.015 + 0.015 * ramp       // 1.5% → 3%
  const pDirt     = Math.max(0.20, 1 - pLava - pGem - pTreasure)
  return { pLava, pGem, pTreasure, pDirt }
}

function pickCell(rng, p) {
  const r = rng()
  if (r < p.pLava) return CELL.LAVA
  if (r < p.pLava + p.pGem) return CELL.GEM
  if (r < p.pLava + p.pGem + p.pTreasure) return CELL.TREASURE
  return CELL.DIRT
}

/**
 * Genera la coppia (sx, dx) per la riga `depth` partendo da `rng`.
 * Anti-blocco: se entrambe sono lava, sostituisce una con DIRT.
 */
export function generateRow(depth, rng) {
  const p = probsAt(depth)
  let left = pickCell(rng, p)
  let right = pickCell(rng, p)
  if (left === CELL.LAVA && right === CELL.LAVA) {
    if (rng() < 0.5) left = CELL.DIRT
    else right = CELL.DIRT
  }
  return { left, right }
}

// Punteggio aggiunto al passaggio su una cella (oltre al +1 metro automatico).
export const CELL_POINTS = {
  [CELL.DIRT]: 0,
  [CELL.GEM]: 10,
  [CELL.TREASURE]: 50,
  [CELL.LAVA]: 0,         // morte, niente punti
}
