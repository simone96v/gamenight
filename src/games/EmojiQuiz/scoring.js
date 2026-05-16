// Calcolo punteggio Emoji Quiz.
// Più rispondi veloce → più punti.
// Usare l'indizio cappa il massimo a 350 (vs 800 senza).
// Combo: streak >= 2 moltiplica fino a 2x.

export const ROUND_MS = 25000
export const HINT_CAP = 350

export const round10 = (x) => Math.round(x / 10) * 10

export const comboMult = (streak) => (streak < 2 ? 1 : Math.min(1 + 0.2 * (streak - 1), 2))

// Punti base: lineari sul tempo residuo. Con hint, cap a HINT_CAP.
//   elapsed = 0    → 800 (cap 350 con hint)
//   elapsed = full → 150 (sempre)
export function basePoints(elapsedMs, hintUsed = false) {
  const r = Math.max(0, Math.min(1, (ROUND_MS - elapsedMs) / ROUND_MS))
  let p = 150 + r * 650
  if (hintUsed) p = Math.min(p, HINT_CAP)
  return p
}
