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

// ── Prefetch tutte le categorie ─────────────────────────────────────
// Strategia: batch endpoint (1 sola chiamata DeepSeek per tutte le categorie)
// con timeout di 15s. Se il batch non risponde in tempo, fallback a chiamate
// individuali parallele. Il progress si aggiorna man mano.
// 5 domande per categoria = 50 totali → prompt snello, risposta in ~3-5s.
// Se il setting viene alzato in TriviaLobby, generateDeck() copre la differenza.
const PREFETCH_COUNT = 5
const BATCH_TIMEOUT_MS = 20000

export const prefetchAllCategories = (onProgress) => {
  if (_prefetchRunning) return
  _prefetchRunning = true

  const categories = TRIVIA_CATEGORIES
  const total = categories.length

  const missing = categories.filter(
    (c) => !_cache.has(c.id) || _cache.get(c.id).length < PREFETCH_COUNT,
  )
  const alreadyCached = total - missing.length
  onProgress?.(alreadyCached, total)

  if (missing.length === 0) {
    _prefetchRunning = false
    onProgress?.(total, total)
    return
  }

  _runPrefetch(missing, PREFETCH_COUNT, alreadyCached, total, onProgress)
    .then(() => {
      _prefetchRunning = false
      console.log('[ai] prefetch complete — all', total, 'categories cached')
    })
    .catch(() => {
      _prefetchRunning = false
    })
}

const _runPrefetch = async (missing, count, baseReady, total, onProgress) => {
  let ready = baseReady
  const catIds = missing.map((c) => c.id)

  // ── Tenta batch con timeout ──
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS)

    const resp = await fetch('/api/generate-trivia-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: catIds, countPerCategory: count }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (resp.ok) {
      const data = await resp.json().catch(() => ({}))
      const decks = data?.decks ?? {}
      let batchHits = 0

      for (const cat of missing) {
        const qs = decks[cat.id]
        if (Array.isArray(qs) && qs.length > 0) {
          _cache.set(cat.id, qs.map((q) => normalize(q, cat.id)))
          batchHits++
        }
        ready++
        onProgress?.(ready, total)
      }

      // Se il batch ha coperto tutto, fine
      if (batchHits === missing.length) return

      // Altrimenti fallback per le categorie mancanti
      const stillMissing = missing.filter(
        (c) => !_cache.has(c.id) || _cache.get(c.id).length < count,
      )
      if (stillMissing.length > 0) {
        console.warn('[ai] batch partial:', batchHits, '/', missing.length, '— falling back for', stillMissing.length)
        await Promise.all(stillMissing.map((c) => generateDeck(c.id, count)))
      }
      return
    }
    console.warn('[ai] batch status', resp.status)
  } catch (err) {
    if (err?.name === 'AbortError') {
      console.warn('[ai] batch timed out after', BATCH_TIMEOUT_MS, 'ms — falling back')
    } else {
      console.warn('[ai] batch failed:', err?.message ?? err)
    }
  }

  // ── Fallback: chiamate individuali parallele ──
  ready = baseReady
  onProgress?.(ready, total)
  await Promise.all(missing.map(async (cat) => {
    await generateDeck(cat.id, count)
    ready++
    onProgress?.(ready, total)
  }))
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
