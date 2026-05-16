// Loader del deck di Emoji Quiz (free-text input).
//
// Pipeline:
//   1. Carica TUTTI i puzzle (Supabase, fallback al bundle locale).
//   2. Per ogni puzzle ricostruisce `answers[]` (varianti accettate):
//      - dalla tabella DB: è già un jsonb array
//      - dal bundle locale: è già definito
//   3. Mescola e seleziona `count` puzzle per la sessione.
//
// Shape del deck:
//   [{ id, emoji, title, category, difficulty, hint, answers[] }, ...]
//
// In online il deck (con answers) viene pubblicato in `gameState.eqDeck`:
// i client lo usano per validare i guess localmente. L'host poi arbitra
// il winner del round confrontando i `timeMs`.

import { supabase } from './supabase'
import { PUZZLES } from '../data/emojiQuizPuzzles'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const loadPool = async () => {
  try {
    const { data, error } = await supabase
      .from('emoji_puzzles')
      .select('id, emoji, title, category, difficulty, hint, answers')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('empty_table')
    return data.map((p) => ({
      ...p,
      answers: Array.isArray(p.answers) ? p.answers : [],
    }))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[emojiQuizDeck] fallback to local PUZZLES:', e?.message)
    return PUZZLES
  }
}

/**
 * Restituisce un deck di `count` puzzle random.
 */
export const loadEmojiQuizDeck = async (count) => {
  const pool = await loadPool()
  return shuffle(pool).slice(0, count)
}

export { PUZZLES }
