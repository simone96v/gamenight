// Helper condivisi per avviare una partita di Trivia.
// Costruisce il deck filtrando le domande GIÀ VISTE nelle partite precedenti
// (tracciate in localStorage per categoria), così le partite consecutive non si
// ripetono fino a quando non si esaurisce il pool.

import { rpcStartGame } from './room'
import { shuffle } from '../utils/deck'

let _questionsCache = null
const loadQuestions = async () => {
  if (!_questionsCache) {
    const mod = await import('../data/questions/trivia.json')
    _questionsCache = mod.default
  }
  return _questionsCache
}

// Una chiave per categoria così cambiando categoria non si perde la storia.
const SEEN_KEY = (cat) => `gn:trivia:seen:${cat ?? 'all'}`

// Quante domande "viste" ricordare al massimo. Tenuto a ~75% del pool per
// categoria così resta sempre un margine fresco prima del reset.
const SEEN_CAP = 75

const loadSeen = (cat) => {
  try {
    const raw = localStorage.getItem(SEEN_KEY(cat))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

const saveSeen = (cat, ids) => {
  try {
    // Tieni solo gli ultimi SEEN_CAP per non far crescere la lista all'infinito.
    const arr = [...ids].slice(-SEEN_CAP)
    localStorage.setItem(SEEN_KEY(cat), JSON.stringify(arr))
  } catch { /* localStorage piena/disabilitata: ignora */ }
}

// Permette al chiamante di azzerare manualmente la memoria (es. da un'opzione
// "ricomincia da capo" nel menu settings).
export const resetTriviaSeen = (cat) => {
  try {
    if (cat) localStorage.removeItem(SEEN_KEY(cat))
    else {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('gn:trivia:seen:'))
        .forEach((k) => localStorage.removeItem(k))
    }
  } catch { /* ignore */ }
}

// Costruisce il deck per la partita.
//  1. filtra per categoria (con fallback all-pool se troppo piccola)
//  2. esclude le domande già viste in partite recenti
//  3. se il pool non-visto è troppo piccolo, ricomincia da zero
//  4. double-shuffle + slice N
//  5. propaga difficulty + topic per scoring e UI
//  6. marca le domande del deck come viste prima di restituirlo
export const buildTriviaDeck = async (category, numQuestions) => {
  const questionsAll = await loadQuestions()
  const filtered = questionsAll.filter((q) => q.category === category)
  const basePool = filtered.length >= numQuestions * 2 ? filtered : questionsAll

  const seen = loadSeen(category)
  let pool = basePool.filter((q) => !seen.has(q.id))

  // Pool fresco esaurito (o quasi): azzera la memoria e riparti dall'intero pool.
  // Una piccola guard per evitare che, nell'edge case di numQuestions enorme,
  // il filtro restituisca 0 e crashi lo shuffle.
  if (pool.length < numQuestions) {
    seen.clear()
    saveSeen(category, seen)
    pool = basePool
  }

  const shuffled = shuffle(shuffle([...pool]))
  const picked = shuffled.slice(0, numQuestions)

  // Memorizza che queste sono state servite, così la prossima partita le evita.
  picked.forEach((q) => seen.add(q.id))
  saveSeen(category, seen)

  return picked.map((q) => ({
    question: q.question,
    answers: q.answers,
    correct: q.correct,
    difficulty: q.difficulty ?? 'medium',
    topic: q.topic ?? null,
  }))
}

// Avvia una partita di Trivia per la stanza corrente.
// `timerDuration` viene salvata in state per essere riletta dal server
// in submit_answer/do_reveal per il calcolo dello speed bonus.
export const startTriviaGame = async ({ roomCode, category, numQuestions, timerDuration = 15 }) => {
  const deck = await buildTriviaDeck(category, numQuestions)
  return rpcStartGame(roomCode, deck, timerDuration)
}
