// Generazione domande via AI con prefetch nella lobby.
//
// Flusso:
//   1. Host entra nella lobby party → prefetchAllCategories() genera deck
//      per tutte le 10 categorie in parallelo (~3-5s totali).
//   2. Il bottone "Avanti" è bloccato finché il prefetch non completa.
//   3. Quando lo spin atterra su una categoria, getCachedDeck() restituisce
//      il deck istantaneamente — zero attesa.
//   4. clearDeckCache() resetta la cache (chiamato a inizio nuova session).
//
// Il pool locale è SOLO fallback di emergenza se l'API è completamente down.

import { shuffle } from '../utils/deck'
import { TRIVIA_CATEGORIES } from '../games/Trivia/constants'

// ── Cache module-level ──────────────────────────────────────────────
// Map<categoryId, question[]> — sopravvive ai re-render, si resetta solo
// esplicitamente con clearDeckCache().
const _cache = new Map()
let _prefetchRunning = false

// ── Helpers ─────────────────────────────────────────────────────────

const fallbackFromLocal = async (category, count) => {
  const questionsAll = (await import('../data/questions/trivia.json')).default
  const filtered = questionsAll.filter((q) => q.category === category)
  const pool = filtered.length >= count ? filtered : questionsAll
  return shuffle(shuffle([...pool])).slice(0, count)
}

const normalize = (q, category) => ({
  question: q.question,
  answers: q.answers,
  correct: q.correct,
  difficulty: q.difficulty ?? 'medium',
  topic: q.topic ?? null,
  category: q.category ?? category,
})

// ── Genera un deck singolo ──────────────────────────────────────────
export const generateDeck = async (category, count = 10) => {
  // Se c'è in cache, usalo (slice al count richiesto).
  const cached = _cache.get(category)
  if (cached && cached.length >= count) {
    return cached.slice(0, count)
  }

  try {
    const resp = await fetch('/api/generate-trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, count }),
    })
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}))
      const qs = Array.isArray(data?.questions) ? data.questions : []
      if (qs.length >= count) {
        const deck = qs.slice(0, count).map((q) => normalize(q, category))
        _cache.set(category, deck)
        return deck
      }
      if (qs.length > 0) {
        const aiPart = qs.map((q) => normalize(q, category))
        const localPart = (await fallbackFromLocal(category, count - qs.length))
          .map((q) => normalize(q, category))
        const deck = [...aiPart, ...localPart]
        _cache.set(category, deck)
        return deck
      }
      console.warn('[ai] no questions returned, falling back to local pool')
    }
  } catch (err) {
    console.warn('[ai] generation failed:', err?.message ?? err)
  }

  const deck = (await fallbackFromLocal(category, count)).map((q) => normalize(q, category))
  _cache.set(category, deck)
  return deck
}

// ── Prefetch tutte le categorie in parallelo ────────────────────────
// Chiamato dalla LobbyScreen quando l'host entra.
// onProgress(ready, total) è opzionale — aggiorna la UI.
// Genera con count=15 (il massimo possibile) così qualunque setting va bene.
const PREFETCH_COUNT = 15

export const prefetchAllCategories = (onProgress) => {
  if (_prefetchRunning) return // già in corso
  _prefetchRunning = true

  const categories = TRIVIA_CATEGORIES
  const total = categories.length
  let ready = 0

  // Notifica subito lo stato iniziale
  onProgress?.(ready, total)

  const promises = categories.map(async (cat) => {
    // Se già in cache (es. da un giro precedente), conta come ready
    if (_cache.has(cat.id) && _cache.get(cat.id).length >= PREFETCH_COUNT) {
      ready++
      onProgress?.(ready, total)
      return
    }
    await generateDeck(cat.id, PREFETCH_COUNT)
    ready++
    onProgress?.(ready, total)
  })

  Promise.all(promises).then(() => {
    _prefetchRunning = false
    console.log('[ai] prefetch complete — all', total, 'categories cached')
  }).catch(() => {
    _prefetchRunning = false
  })
}

// ── Accesso cache ───────────────────────────────────────────────────

// Restituisce il deck cachato, slicato a count. null se non c'è.
export const getCachedDeck = (categoryId, count = 10) => {
  const cached = _cache.get(categoryId)
  if (!cached || cached.length < count) return null
  return cached.slice(0, count)
}

// Quante categorie sono pronte in cache?
export const getPrefetchProgress = () => ({
  ready: _cache.size,
  total: TRIVIA_CATEGORIES.length,
  done: _cache.size >= TRIVIA_CATEGORIES.length,
})

// Svuota cache (inizio nuova session completa).
export const clearDeckCache = () => {
  _cache.clear()
  _prefetchRunning = false
}

// Compat — alias legacy
export const clearAiCache = clearDeckCache
export const prefetchCategory = () => {}
