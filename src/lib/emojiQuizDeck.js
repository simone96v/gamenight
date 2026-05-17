// Pool statico delle domande di Movie Quiz.
//
// Carica le domande dal JSON bundlato e filtra a film + serie TV.
// Le altre categorie del dataset (canzoni, videogiochi, marchi) sono ignorate.
// Difficoltà: 1 (easy) | 2 (medium) | 3 (hard)
//
// Lazy import + cache in memoria: async solo al primo accesso, poi istantaneo.

let _pool = null
let _loadPromise = null

const ALLOWED_CATEGORIES = new Set(['film', 'serie_tv'])

const ensurePool = async () => {
  if (_pool) return _pool
  if (_loadPromise) return _loadPromise
  _loadPromise = import('../data/questions/emojiquiz.json').then((m) => {
    _pool = (m.default || []).filter((p) => ALLOWED_CATEGORIES.has(p.category))
    return _pool
  })
  return _loadPromise
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const EMOJI_QUIZ_CATEGORIES = [
  { id: 'film',     label: 'Film',     emoji: '🎬', color: '#F97316' },
  { id: 'serie_tv', label: 'Serie TV', emoji: '📺', color: '#EC4899' },
]

export const getCategoryById = (id) =>
  EMOJI_QUIZ_CATEGORIES.find((c) => c.id === id) ?? EMOJI_QUIZ_CATEGORIES[0]

// Difficoltà → numero usato nei puzzle JSON (null = mix di tutte le difficoltà).
const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3 }

/**
 * Carica un deck di Movie Quiz (film + serie TV), con anti-repeat
 * tramite localStorage. Stesso pattern di triviaSetup.buildTriviaDeck.
 *
 *   count: numero di puzzle desiderati
 *   difficulty: 'mix' | 'easy' | 'medium' | 'hard' (default 'mix')
 */
export const loadEmojiQuizDeck = async (count = 7, difficulty = 'mix') => {
  const pool = await ensurePool()
  const lvl = DIFFICULTY_LEVEL[difficulty]
  // Se il filtro per difficoltà lascia meno puzzle di quanti ne servono,
  // ricado sul pool intero (meglio servire qualche puzzle off-difficulty che bloccare la partita).
  const filtered = lvl ? pool.filter((p) => p.difficulty === lvl) : pool
  const basePool = filtered.length >= count ? filtered : pool

  const seen = loadSeen()
  let candidates = basePool.filter((p) => !seen.has(p.id))

  // Pool fresco esaurito → reset.
  if (candidates.length < count) {
    seen.clear()
    saveSeen(seen)
    candidates = basePool
  }

  const picked = shuffle(shuffle([...candidates])).slice(0, Math.min(count, candidates.length))

  // Marca come visti per la prossima partita.
  picked.forEach((p) => seen.add(p.id))
  saveSeen(seen)

  return picked
}

// Preload sincrono — chiamabile dalla lobby per garantire deck istantaneo allo start.
export const preloadEmojiQuizPool = () => ensurePool()

// ── Anti-repeat localStorage (mirroring src/lib/triviaSetup.js) ────────

const SEEN_KEY = 'gn:emojiquiz:seen:movie'
const SEEN_CAP = 40 // ~80% del pool film+serie_tv (50 puzzle)

const loadSeen = () => {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

const saveSeen = (ids) => {
  try {
    const arr = [...ids].slice(-SEEN_CAP)
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
  } catch { /* localStorage pieno/disabilitato */ }
}

export const resetEmojiQuizSeen = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('gn:emojiquiz:seen:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
}
