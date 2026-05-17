// Validazione del nome scelto dal giocatore o del party.
// Blacklist da `banned-words.js` (auto-generated: LDNOOBW it/en/es/fr/de/pt
// + aggiunte specifiche italiane: bestemmie composte, fascismo, slur).
// Match substring sulla forma normalizzata (lowercase + strip diacritics +
// leet conversion 0/1/3/4/5/7/8/@/$/€ → lettere + strip non-letter).
// Per rigenerare: `node scripts/build-blacklist.mjs`.

import { BANNED_WORDS as BANNED } from './banned-words'

const DEFAULT_MAX_LEN = 12
const MIN_LEN = 1

const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '€': 'e',
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[01345780@$€]/g, (c) => LEET_MAP[c] || c) // leet → letters
    .replace(/[^a-z]/g, '')                              // strip spaces / punct / digits residui
}

/**
 * Restituisce { valid, reason, empty }.
 * - empty=true → campo vuoto, nessun warning visivo (l'UI lo distinguerà)
 * - valid=false + reason → mostra warning all'utente
 */
export function validatePlayerName(name, { maxLen = DEFAULT_MAX_LEN } = {}) {
  const trimmed = (name || '').trim()
  if (trimmed.length < MIN_LEN) {
    return { valid: false, reason: null, empty: true }
  }
  if (trimmed.length > maxLen) {
    return { valid: false, reason: `Massimo ${maxLen} caratteri.`, empty: false }
  }
  const norm = normalize(trimmed)
  if (norm.length === 0) {
    return { valid: false, reason: 'Inserisci almeno una lettera.', empty: false }
  }
  for (const banned of BANNED) {
    if (norm.includes(banned)) {
      return {
        valid: false,
        reason: 'Contiene parole non consentite. Scegline un altro.',
        empty: false,
      }
    }
  }
  return { valid: true, reason: null, empty: false }
}
