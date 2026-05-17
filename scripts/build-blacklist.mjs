// Build script per generare src/utils/banned-words.js
// Combina LDNOOBW (it+en+es+fr+de+pt) + aggiunte specifiche italiane
// (bestemmie composte, riferimenti fascisti/nazisti, slur omofobi),
// normalizza ogni termine e dedupa.
//
// Uso: node scripts/build-blacklist.mjs (dalla root di gamenight/).
// Richiede Node ≥18 per fetch built-in.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const OUT = path.join(PROJECT_ROOT, 'src', 'utils', 'banned-words.js')

const LDNOOBW_BASE = 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master'
const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt']

// Soglia minima caratteri (dopo normalize) per inserire un termine in blacklist.
// 5 = compromesso permissivo: blocca parole offensive di lunghezza media+
// ma evita match troppo aggressivi su radici comuni (es. "ass", "cum", "anal").
const MIN_LEN = 5

// Termini italiani/internazionali ad alta probabilità di falso positivo:
// li escludiamo anche se appaiono in LDNOOBW. La logica: termini comuni
// che fanno parte di nomi, cognomi, parole neutre comuni.
const MANUAL_EXCLUSIONS = new Set([
  'balle',    // ballerini, ballerina
  'biga',     // bigatto (raro insulto)
  'bimbo',    // ambiguo, anche affettuoso
  'burro',    // alimento italiano
  'cagna',    // femmina del cane (anche insulto, ma molto comune)
  'cesso',    // bagno (volgare ma non offensivo verso persone)
  'comer',    // mangiare in spagnolo
  'asno',     // asino in spagnolo (animale)
  'bosta',    // raro
  'bonze',    // monaco buddista
  'boner',    // gergale, troppi FP
  'bonza',    // raro
  'busty',    // troppi FP
  'amador',   // nome proprio comune
  'aranha',   // ragno in portoghese
  'pajero',   // termine giapponese (auto), insulto solo in ES
])

const LEET_MAP = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','€':'e' }
const COMBINING_DIACRITICS = /[̀-ͯ]/g

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(COMBINING_DIACRITICS, '')
    .replace(/[01345780@$€]/g, (c) => LEET_MAP[c] || c)
    .replace(/[^a-z]/g, '')
}

// Aggiunte specifiche italiane (non presenti in LDNOOBW):
// bestemmie composte, fascismo/nazismo italiano, slur razzisti/omofobi recenti.
const ITALIAN_EXTRAS = [
  // ---- Bestemmie composte ----
  'porcodio','porkodio','porcadio','porkadio',
  'diocane','diokane','dioporco','dioporko',
  'diobestia','dioboia','diomerda','diocaro','diosch','diofulmine','diobono','dioschifoso',
  'madonnaporca','madonnatroia','madonnaputtana','madonnaboia','madonnabocchina',
  'porcamadonna','porkamadonna','porcomadonna',
  'cristoporco','porcocristo','gesuporco','porcogesu','gesucristoporco',
  'mariaporca','santiddio','sangueporco','sanguepor',
  // ---- Volgarità sessuali (composti chiari) ----
  'vaffanculo','vaffankulo','vafanculo','vafankulo','fanculo',
  'figliodiputtana','figliodicagna','figlioditroia','figliodimignotta',
  'minkione','minchione','cazzodi','culodimerda',
  // ---- Slur razzisti italiani ----
  'negro','negra','negri','negre',
  'negraccio','negretto','sporconegro','sporkonegro',
  'zingaro','zingara','zingari','zingare','zingaraccio','zingaracci',
  'mongoloide','mongoloidi','mongolo',
  'crucco','crucca','crucchi',
  'maranza','musodimerda',
  'cinesedimerda','cinesedimer','sporcocinese','sporkocinese',
  'terrone','terrona','terroni',
  'polentone','polentona','polentoni',
  // ---- Slur antisemiti ----
  'kike','kikes','kikey',
  'ebreaccio','ebreoporco','ebreocane','ebreomerda','ebreodimerda',
  'gasthejew','gasthejews','asoap','holocaustnever','shoahnotreal',
  // ---- Fascismo / nazismo ----
  'mussolini','ilduce','boiachimolla','eiaeiaalala',
  'hitler','fuhrer','fuehrer','adolfhitler','adolph',
  'nazista','nazisti','nazifascista','naziskin','nazifash',
  'siegheil','sieghail','heilhitler','seighail','heil88',
  '1488','14words','dna88','hh88',
  'forzanuova','casapound','salutoromano','salutiromani',
  'finalsolution','solucionfinal',
  'kkk','kuklux','kuklusklan',
  // ---- Omofobia / transfobia ----
  'frocio','frocia','froci','frociaccio','frociaccia','frociodimerda',
  'ricchione','rikkione','ricchioni','rikkioni',
  'culattone','culattoni','kulattone','kulattoni',
]

async function fetchLang(lang) {
  const url = `${LDNOOBW_BASE}/${lang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${lang}: HTTP ${res.status}`)
  return res.text()
}

async function main() {
  const all = new Set()
  const stats = {}

  for (const lang of LANGS) {
    const raw = await fetchLang(lang)
    let added = 0
    for (const line of raw.split(/\r?\n/)) {
      const term = line.trim()
      if (!term || term.startsWith('#')) continue
      const norm = normalize(term)
      if (norm.length >= MIN_LEN && !MANUAL_EXCLUSIONS.has(norm) && !all.has(norm)) {
        all.add(norm)
        added++
      }
    }
    stats[lang] = added
  }

  let extraAdded = 0
  for (const term of ITALIAN_EXTRAS) {
    const norm = normalize(term)
    if (norm.length >= MIN_LEN && !MANUAL_EXCLUSIONS.has(norm) && !all.has(norm)) {
      all.add(norm)
      extraAdded++
    }
  }
  stats.italian_extras = extraAdded

  const sorted = Array.from(all).sort()
  const body = `[\n  ${sorted.map((t) => JSON.stringify(t)).join(',\n  ')}\n]`

  const header = `// AUTO-GENERATED — non editare a mano. Rigenerare con \`node scripts/build-blacklist.mjs\`.
// Combina LDNOOBW (it/en/es/fr/de/pt) + aggiunte italiane specifiche
// (bestemmie composte, fascismo/nazismo, slur). Tutti i termini sono già
// nella forma normalizzata (lowercase, diacritics strip, leet conversion,
// solo lettere a-z) per match substring O(N) contro l'input normalizzato.
// Fonte LDNOOBW: github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words

export const BANNED_WORDS = ${body}
`

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, header, 'utf8')

  console.log(`Wrote ${sorted.length} terms → ${path.relative(PROJECT_ROOT, OUT)}`)
  console.log('Stats per source:', stats)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
