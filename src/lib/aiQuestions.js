// Generazione domande via AI — ogni round chiama OpenRouter per domande fresche.
// Il pool locale è SOLO fallback di emergenza se l'API è completamente down.

import questionsAll from '../data/questions/trivia.json'
import { shuffle } from '../utils/deck'

// Fallback emergenza: usato solo se l'API non risponde.
const fallbackFromLocal = (category, count) => {
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

// Genera un deck di N domande SEMPRE FRESCHE via AI.
// Nessuna cache: ogni chiamata produce domande nuove.
export const generateDeck = async (category, count = 10) => {
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
        return qs.slice(0, count).map((q) => normalize(q, category))
      }
      // AI ha risposto ma con poche domande — integra con quelle che ha dato
      if (qs.length > 0) {
        const aiPart = qs.map((q) => normalize(q, category))
        const localPart = fallbackFromLocal(category, count - qs.length)
          .map((q) => normalize(q, category))
        return [...aiPart, ...localPart]
      }
      console.warn('[ai] no questions returned, falling back to local pool')
    }
  } catch (err) {
    console.warn('[ai] generation failed:', err?.message ?? err)
  }

  // Fallback emergenza
  return fallbackFromLocal(category, count).map((q) => normalize(q, category))
}

// No-op: la cache non esiste più, ma l'interfaccia resta per compatibilità.
export const clearAiCache = () => {}
export const prefetchCategory = () => {}
