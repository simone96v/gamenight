// Pool statico di domande trivia.
//
// Carica le domande dal JSON pre-generato (5000 domande, 500 per categoria)
// e le serve istantaneamente. Nessuna chiamata API a runtime.
//
// Flusso:
//   1. getDeck(categoryId, count) → shuffle e slice dal pool locale
//   2. Zero latenza, zero cold start, zero dipendenze esterne
//
// Il pool viene caricato lazy al primo accesso (dynamic import) e cachato.

import { shuffle } from '../utils/deck'

let _pool = null
let _loadPromise = null

// Carica il pool una sola volta (lazy, cachato).
const ensurePool = async () => {
  if (_pool) return _pool
  if (_loadPromise) return _loadPromise
  _loadPromise = import('../data/questions/trivia.json')
    .then((m) => {
      _pool = m.default
      return _pool
    })
  return _loadPromise
}

// Restituisce `count` domande per la categoria data, shufflate.
// Async solo la prima volta (lazy import), poi istantaneo.
export const getDeck = async (categoryId, count = 10) => {
  const pool = await ensurePool()
  const filtered = pool.filter((q) => q.category === categoryId)
  const shuffled = shuffle([...filtered])
  return shuffled.slice(0, count).map((q) => ({
    question: q.question,
    answers: q.answers,
    correct: q.correct,
    difficulty: q.difficulty ?? 'medium',
    topic: q.topic ?? null,
    category: q.category ?? categoryId,
  }))
}

// Preload sincrono del pool — chiamato nella lobby per garantire
// che getDeck sia istantaneo al momento dello spin.
export const preloadPool = () => ensurePool()

// ── Compat aliases (usati da codice legacy) ──
export const generateDeck = getDeck
export const getCachedDeck = () => null  // Niente cache, getDeck è già veloce
export const clearDeckCache = () => {}
export const clearAiCache = () => {}
export const prefetchAllCategories = () => {}
export const prefetchCategory = () => {}
export const getPrefetchProgress = () => ({ ready: 10, total: 10, done: true })
