// Pool di rack da 7 lettere distinte. Ogni rack è un pangram (parola italiana
// di 7 lettere che usa tutte e 7 le lettere) — esiste sempre almeno una
// soluzione massima da 7 lettere, e tante sotto-parole più corte.
//
// Le parole sono validate contro il dizionario IT a 3-7 lettere
// (public/scramble/italian_3_7.txt).

export const RACKS = [
  'AGRESTI',
  'ANGURIE',
  'BERMUDA',
  'BORSATE',
  'CHELATI',
  'COLMATI',
  'CORDAME',
  'CREMATI',
  'CRESIMA',
  'CROTALI',
  'CULTORE',
  'DIVOLTA',
  'EPIGONA',
  'FASCINO',
  'FILMERA',
  'FORCINA',
  'FORNITE',
  'GLOSARE',
  'INCLUSO',
  'INGRATE',
  'INTEGRA',
  'INVOLGA',
  'ISOLANE',
  'LIBERTO',
  'MAESTRI',
  'MAESTRO',
  'MENISCO',
  'PORCILE',
  'SFACELO',
  'SPEDITA',
  'TEDIOSA',
  'TRANCHE',
  'TRONCHE',
]

function isValid(rack) {
  if (!rack || rack.length !== 7) return false
  if (!/^[A-Z]{7}$/.test(rack)) return false
  return new Set(rack).size === 7
}

const VALID_RACKS = RACKS.filter(isValid)

export function pickRackBySeed(seedInt) {
  if (typeof seedInt !== 'number' || !VALID_RACKS.length) return VALID_RACKS[0]
  const idx = Math.abs(seedInt) % VALID_RACKS.length
  return VALID_RACKS[idx]
}

// Pickup di 3 rack diversi a partire da un seed deterministico (per i 3 round).
export function pickRoundRacks(seedInt, count = 3) {
  const out = []
  const used = new Set()
  let s = seedInt >>> 0
  while (out.length < count && used.size < VALID_RACKS.length) {
    s = (s * 1664525 + 1013904223) >>> 0
    const idx = s % VALID_RACKS.length
    if (used.has(idx)) continue
    used.add(idx)
    out.push(VALID_RACKS[idx])
  }
  return out
}

export function shuffleRack(rack, rng = Math.random) {
  const arr = rack.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}
