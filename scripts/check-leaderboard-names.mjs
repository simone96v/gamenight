// One-off: scan stdin (one name per line) through validatePlayerName logic
// and emit { name, banned, matched } records. Used to identify leaderboard
// entries that fail the restored vocabulary rules.
//
// Usage:
//   node scripts/check-leaderboard-names.mjs < names.txt

import { BANNED_WORDS as BANNED } from '../src/utils/banned-words.js'

const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '€': 'e',
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[01345780@$€]/g, (c) => LEET_MAP[c] || c)
    .replace(/[^a-z]/g, '')
}

function firstBanned(name) {
  const norm = normalize(name)
  if (!norm) return null
  for (const w of BANNED) {
    if (norm.includes(w)) return w
  }
  return null
}

const input = await new Promise((resolve) => {
  let data = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => { data += c })
  process.stdin.on('end', () => resolve(data))
})

const names = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
for (const n of names) {
  const m = firstBanned(n)
  console.log(JSON.stringify({ name: n, banned: !!m, matched: m, norm: normalize(n) }))
}
