// Loader del deck di Emoji Quiz.
// Prima prova Supabase (tabella `emoji_puzzles`). Fallback al bundle locale se:
//   - la tabella non esiste (migration non ancora applicata)
//   - il client è offline
//   - Supabase ritorna un errore
//
// L'host è l'unico a chiamare questa funzione in online; il deck completo
// (con `answers`) viene poi condiviso con tutti via gameState.eqDeck.

import { supabase } from './supabase'
import { PUZZLES, pickDeck as pickLocalDeck } from '../data/emojiQuizPuzzles'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Restituisce `count` puzzle random, da Supabase se disponibile, altrimenti
 * dal bundle locale. Shape uniforme: { id, emoji, title, category, difficulty, hint, answers[] }.
 */
export const loadEmojiQuizDeck = async (count) => {
  try {
    const { data, error } = await supabase
      .from('emoji_puzzles')
      .select('id, emoji, title, category, difficulty, hint, answers')

    if (error) throw error
    if (!data || data.length === 0) throw new Error('empty_table')

    return shuffle(data).slice(0, count).map((p) => ({
      ...p,
      // Supabase ritorna `answers` come jsonb; assicuriamoci sia un array.
      answers: Array.isArray(p.answers) ? p.answers : [],
    }))
  } catch (e) {
    // Fallback silenzioso al bundle locale.
    // Non logghiamo in produzione perché è un fallback legittimo se la migration
    // non è ancora applicata.
    if (import.meta.env.DEV) console.warn('[emojiQuizDeck] fallback to local PUZZLES:', e?.message)
    return pickLocalDeck(count)
  }
}

// Re-export per comodità single-player (Fase 2 path).
export { PUZZLES, pickLocalDeck }
