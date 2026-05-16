// Loader del dizionario italiano (3-7 lettere maiuscole). Il file vive in
// public/scramble/italian_3_7.txt (~500KB, ~70k parole) e viene fetched al
// primo bisogno, poi tenuto in memoria come Set per validazioni O(1).

const URL = `${import.meta.env.BASE_URL || '/'}scramble/italian_3_7.txt`

let cached = null
let inflight = null

export async function loadDictionary() {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(URL)
      if (!res.ok) throw new Error(`dict_http_${res.status}`)
      const text = await res.text()
      const set = new Set()
      for (const line of text.split(/\r?\n/)) {
        const w = line.trim()
        if (!w) continue
        set.add(w.toUpperCase())
      }
      cached = set
      return cached
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function isInDictionary(word, dict) {
  if (!dict || !word) return false
  return dict.has(word.toUpperCase())
}

// Verifica che la parola sia formabile dal rack (usando ogni tessera al massimo una volta).
export function isFormable(word, rack) {
  if (!word || !rack) return false
  const w = word.toUpperCase()
  const used = new Array(rack.length).fill(false)
  for (const ch of w) {
    let found = -1
    for (let i = 0; i < rack.length; i++) {
      if (!used[i] && rack[i] === ch) { found = i; break }
    }
    if (found === -1) return false
    used[found] = true
  }
  return true
}

// Calcola punteggio singola parola secondo le regole del brief.
// 3→1, 4→3, 5→6, 6→10, 7→15. Pangram (=7 lettere usate tutte) ×2.
export function scoreWord(word, rackLen = 7) {
  const n = word ? word.length : 0
  const base = { 3: 1, 4: 3, 5: 6, 6: 10, 7: 15 }[n] || 0
  if (!base) return 0
  if (n === rackLen) return base * 2
  return base
}
