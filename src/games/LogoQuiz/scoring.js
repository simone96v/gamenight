// Scoring LogoQuiz — formula completa (vedi GDD §3).
//
//   points = (BASE + speed_bonus + streak_bonus) * tier_mult
//
// Riferimenti:
//   BASE          = 10
//   speed_bonus   = round((1 - elapsed/timer) * 6)   range 0..6
//   streak_bonus  = min((streak - 1) * 2, 10)        0 alla 1ª, +2 alla 2ª, …, cap +10 alla 6ª
//   tier_mult     = { easy: 1.0, medium: 1.2, hard: 1.5 }

export const BASE = 10
export const SPEED_BONUS_MAX = 6
export const STREAK_BONUS_STEP = 2
export const STREAK_BONUS_CAP = 10

export const TIER_MULT = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
}

export function speedBonus({ elapsedMs, timerMs }) {
  if (!timerMs || timerMs <= 0) return 0
  const ratio = Math.max(0, Math.min(1, 1 - elapsedMs / timerMs))
  return Math.round(ratio * SPEED_BONUS_MAX)
}

export function streakBonus(currentStreak) {
  if (!currentStreak || currentStreak < 2) return 0
  return Math.min((currentStreak - 1) * STREAK_BONUS_STEP, STREAK_BONUS_CAP)
}

export function tierMult(tier) {
  return TIER_MULT[tier] ?? 1.0
}

// streak qui è il valore POST-incremento (la risposta corrente è la N-esima della streak).
export function computeRoundPoints({ correct, elapsedMs, timerMs, streak = 0, tier = 'easy' }) {
  if (!correct) return 0
  const raw = (BASE + speedBonus({ elapsedMs, timerMs }) + streakBonus(streak)) * tierMult(tier)
  return Math.round(raw)
}
