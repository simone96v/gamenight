// Validazione del nome scelto dal giocatore o del party.
// Versione minimale: niente blacklist parole, solo check di lunghezza e
// presenza di almeno una lettera dopo normalizzazione (così "    " o ";;;"
// vengono rifiutati). Il file utils/banned-words.js è conservato per riabilitarlo
// in futuro ma non viene più importato qui.

const DEFAULT_MAX_LEN = 12
const MIN_LEN = 1

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]/g, '')                  // strip spaces / punct
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
  return { valid: true, reason: null, empty: false }
}
