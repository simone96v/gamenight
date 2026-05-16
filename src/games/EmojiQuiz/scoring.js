// Calcolo punteggio Emoji Quiz.
// Più rispondi veloce → più punti. L'indizio dimezza il massimo.
// Le combo (>=2 risposte corrette di fila) moltiplicano fino a 2x.

export const ROUND_MS = 25000

export const round10 = (x) => Math.round(x / 10) * 10

// Moltiplicatore combo: streak 1 → 1x, 2 → 1.2x, 3 → 1.4x, ... cap 2.0x.
export const comboMult = (streak) => (streak < 2 ? 1 : Math.min(1 + 0.2 * (streak - 1), 2))

// Punti base: lineari sul tempo residuo. Con hint, cap a 350.
export function basePoints(elapsedMs, hint) {
  const r = Math.max(0, Math.min(1, (ROUND_MS - elapsedMs) / ROUND_MS))
  let p = 150 + r * 650
  if (hint) p = Math.min(p, 350)
  return p
}

// Tempo simulato del bot Blobby (solo single-player).
// 13% di probabilità di "buco" (Infinity → mai risposto, va in timeout).
export function computeOppTime(puzzle, roundIdx) {
  if (Math.random() < 0.13) return Infinity
  const bands = { 1: [4500, 11000], 2: [6500, 15000], 3: [8500, 19000] }
  let [lo, hi] = bands[puzzle.difficulty] || bands[2]
  if (roundIdx === 0) hi += 2500 // opener un po' più morbido
  return lo + Math.random() * (hi - lo)
}
