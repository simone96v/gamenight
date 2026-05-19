// Deck builder per LogoQuiz.
// Costruisce N round con 1 brand corretto + 3 distrattori, e assegna a ciascun
// round un tier di presentazione (easy/medium/hard) secondo il mix scelto.
//
// Strategia distrattori:
//   1. Stesso cluster del corretto (ideale)
//   2. Se il cluster ha <3 altri brand, fallback su pool globale
//
// Strategia tier:
//   Il mix definisce la frequenza target di ogni tier nel deck. Distribuiamo i
//   tier in modo deterministico (count = round(N * frequency)) poi mischiamo
//   l'ordine, così su 10 round non c'è mai un cluster di 5 hard di seguito.
//   Per brand con `monochromeFile=null` (no silhouette pulita), forziamo il
//   downgrade del round a 'medium'.

const MIX_PRESETS = {
  easy:     { easy: 0.80, medium: 0.15, hard: 0.05 },
  balanced: { easy: 0.50, medium: 0.30, hard: 0.20 },
  brutal:   { easy: 0.20, medium: 0.40, hard: 0.40 },
}

export const DEFAULT_MIX = 'balanced'
export const MIX_OPTIONS = Object.keys(MIX_PRESETS)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Restituisce un array di N tier in ordine casuale rispettando le frequenze del preset.
// Esempio (N=10, balanced 50/30/20): 5 easy + 3 medium + 2 hard, shuffled.
function buildTierSequence(n, mix) {
  const preset = MIX_PRESETS[mix] ?? MIX_PRESETS[DEFAULT_MIX]
  const easyCount = Math.round(n * preset.easy)
  const hardCount = Math.round(n * preset.hard)
  const mediumCount = Math.max(0, n - easyCount - hardCount)
  const tiers = [
    ...Array(easyCount).fill('easy'),
    ...Array(mediumCount).fill('medium'),
    ...Array(hardCount).fill('hard'),
  ]
  return shuffle(tiers)
}

export function pickRounds(brands, { numLogos = 5, mix = DEFAULT_MIX } = {}) {
  if (!Array.isArray(brands) || brands.length < 4) {
    throw new Error('pickRounds: serve un pool di almeno 4 brand')
  }
  const pool = shuffle(brands)
  const target = Math.min(numLogos, pool.length)
  const tierSeq = buildTierSequence(target, mix)
  const rounds = []
  for (let i = 0; i < target; i++) {
    const correct = pool[i]
    const intra = brands.filter((b) => b.id !== correct.id && b.cluster === correct.cluster)
    const cross = brands.filter((b) => b.id !== correct.id && b.cluster !== correct.cluster)
    const distractorPool = intra.length >= 3 ? intra : shuffle([...intra, ...cross])
    const distractors = shuffle(distractorPool).slice(0, 3)
    const options = shuffle([correct, ...distractors]).map((b) => ({
      id: b.id,
      brand: b.brand,
      cluster: b.cluster,
    }))
    const correctIdx = options.findIndex((o) => o.id === correct.id)

    // Tier downgrade: se il brand non ha mono e ci hanno assegnato hard, scendi a medium.
    let tier = tierSeq[i]
    if (tier === 'hard' && !correct.logo?.monochromeFile) {
      tier = 'medium'
    }

    rounds.push({
      logoId: correct.id,
      brand: correct.brand,
      cluster: correct.cluster,
      logo: correct.logo,
      options,
      correct: correctIdx,
      tier,
    })
  }
  return rounds
}
