// Text matching per Emoji Quiz (free-text input).
// `isCorrect(guess, puzzle)` → bool. La match è fuzzy:
//   - normalizza (case, diacritici NFD, punteggiatura, stopwords)
//   - confronto esatto OR Levenshtein <= 2 (1 se la risposta è <= 4 char)
//   - substring contenuto (per risposte lunghe >= 4 char)
// I client la usano per validare localmente prima di inviare timeMs all'host.

const STOP = new Set(['il','lo','la','i','gli','le','l','un','uno','una','the','a','an'])
const DIACRITICS_RE = /[̀-ͯ]/g

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w))
    .join(' ')
    .trim()
}

// Distanza di Levenshtein iterativa (O(m*n) tempo, O(n) memoria).
export function lev(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

export function isCorrect(guess, puzzle) {
  const g = normalize(guess)
  if (!g) return false
  const variants = puzzle?.answers ?? []
  return variants.some((ans) => {
    const a = normalize(ans)
    if (!a) return false
    if (g === a) return true
    const thr = a.length <= 4 ? 1 : 2
    if (lev(g, a) <= thr) return true
    if (a.length >= 4 && g.includes(a)) return true
    return false
  })
}
