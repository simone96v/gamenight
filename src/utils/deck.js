// Utility per mischiare array.
// `shuffle` è non-deterministico.
// `seededShuffle` è deterministico dato un seed — utile in multiplayer
// se serve garantire stesso ordine senza scambiare l'intero deck (in pratica
// l'host pusha il deck su Supabase, ma manteniamo seeded per coerenza/testing).

// PRNG mulberry32 — veloce, qualità sufficiente per giochi.
const mulberry32 = (seed) => {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Hash deterministico stringa → int32, per accettare seed testuali (es. roomCode).
const hashSeed = (seed) => {
  if (typeof seed === 'number') return seed >>> 0
  const s = String(seed ?? '')
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Fisher-Yates standard.
export const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Fisher-Yates con PRNG seedato.
export const seededShuffle = (arr, seed) => {
  const a = [...arr]
  const rand = mulberry32(hashSeed(seed))
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
