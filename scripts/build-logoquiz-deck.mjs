// Build pipeline per il deck di Logo Quiz.
//
// Flow per ogni brand in scripts/logoquiz-brands.json:
//   1. Query Wikidata SPARQL (P154 = logo image) → ottieni filename Commons + label
//   2. Download da Wikimedia Special:FilePath rasterizzato a 512px (user-agent obbligatorio)
//   3. Sharp: flatten su bianco, resize 400x400 fit=contain, WebP q=85
//   4. (Se tier hard) genera variante monocroma "silhouette"
//   5. Scrivi public/logoquiz/{slug}.webp (+ .mono.webp opzionale)
//
// Output finale:
//   - src/data/questions/logoquiz.json   → array di record consumati dal gioco
//   - docs/logoquiz-credits.md           → attribution Wikimedia Commons
//
// Uso:
//   node scripts/build-logoquiz-deck.mjs            # incremental (skip esistenti)
//   node scripts/build-logoquiz-deck.mjs --force    # ri-fetch tutto

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INPUT = path.join(ROOT, 'scripts', 'logoquiz-brands.json')
const OUT_IMG_DIR = path.join(ROOT, 'public', 'logoquiz')
const OUT_DECK = path.join(ROOT, 'src', 'data', 'questions', 'logoquiz.json')
const OUT_CREDITS = path.join(ROOT, 'docs', 'logoquiz-credits.md')

const FORCE = process.argv.includes('--force')
const ONLY = (() => {
  const i = process.argv.indexOf('--only')
  return i >= 0 ? process.argv[i + 1] : null
})()

// Wikimedia/Wikidata richiedono user-agent identificabile (policy).
const UA = 'BlobParty-LogoQuiz-Builder/1.0 (https://github.com/simone96v; contact via app)'
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath'

const TARGET_SIZE = 400
const SRC_RENDER_SIZE = 512   // Special:FilePath renderizza SVG a questa larghezza
const WEBP_QUALITY = 85

const TIERS_DEFAULT = ['easy', 'medium', 'hard']

// ─── Helpers HTTP ──────────────────────────────────────────────────────────
async function httpJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json,application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  return res.json()
}

async function httpBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

// ─── Wikidata: ottieni filename del logo (P154) + label brand ─────────────
async function fetchLogoMeta(qid) {
  const sparql = `
    SELECT ?logo ?logoLabel ?brandLabel ?coordinates ?inception WHERE {
      OPTIONAL { wd:${qid} wdt:P154 ?logo. }
      OPTIONAL { wd:${qid} wdt:P159 ?hq. ?hq wdt:P625 ?coordinates. }
      OPTIONAL { wd:${qid} wdt:P571 ?inception. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". wd:${qid} rdfs:label ?brandLabel. }
    } LIMIT 1
  `
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(sparql)}`
  const data = await httpJson(url)
  const row = data.results?.bindings?.[0]
  if (!row || !row.logo) {
    return { ok: false, reason: 'no_p154' }
  }
  // row.logo.value è un URL tipo http://commons.wikimedia.org/wiki/Special:FilePath/Apple_logo_black.svg
  // Estraiamo il filename finale.
  const logoUrl = row.logo.value
  const fileName = decodeURIComponent(logoUrl.split('/').pop() || '')
  return {
    ok: true,
    fileName,
    brandLabel: row.brandLabel?.value ?? null,
    inception: row.inception?.value ?? null,
  }
}

// ─── Commons: scarica il logo rasterizzato ─────────────────────────────────
async function downloadLogoBuffer(fileName) {
  // Special:FilePath supporta query string ?width=N che ridimensiona/rasterizza al volo.
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(fileName)}?width=${SRC_RENDER_SIZE}`
  return httpBuffer(url)
}

// ─── Commons: metadata licenza per credits ─────────────────────────────────
async function fetchLicense(fileName) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'extmetadata',
    format: 'json',
    origin: '*',
  })
  try {
    const data = await httpJson(`${COMMONS_API}?${params}`)
    const pages = data?.query?.pages || {}
    const first = Object.values(pages)[0]
    const meta = first?.imageinfo?.[0]?.extmetadata || {}
    return {
      license: meta.LicenseShortName?.value || meta.License?.value || 'unknown',
      artist: stripHtml(meta.Artist?.value || ''),
      attribution: stripHtml(meta.Attribution?.value || ''),
    }
  } catch (e) {
    return { license: 'unknown', artist: '', attribution: '', error: e.message }
  }
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// ─── Sharp: ottimizza il buffer in WebP 400x400 su bianco ──────────────────
async function makeColor(buffer, outPath) {
  await sharp(buffer)
    .flatten({ background: '#ffffff' })
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: '#ffffff',
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath)
}

async function makeMonochrome(buffer, outPath) {
  // Strategia alpha-mask: usa il canale alpha del PNG (Wikimedia Special:FilePath restituisce
  // SVG renderizzato con bg trasparente) come maschera della shape, quindi:
  //   alpha > 0 → soggetto → output NERO
  //   alpha = 0 → bg       → output BIANCO
  // Funziona per qualsiasi logo a colori (anche M giallo McDonald's, IG gradient).
  // Fallback: se l'immagine sorgente è opaca (no alpha), la silhouette risulterà tutta nera
  // e il brand andrà escluso dal tier hard via tiers: ['easy','medium'] nel seed.
  await sharp(buffer)
    .ensureAlpha()
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extractChannel('alpha')
    .threshold(1)
    .negate()
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath)
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
  const brands = (input.brands || []).filter((b) => !ONLY || b.slug === ONLY)
  if (brands.length === 0) {
    console.error(`No brands to process${ONLY ? ` (filter: --only ${ONLY})` : ''}`)
    process.exit(1)
  }

  fs.mkdirSync(OUT_IMG_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(OUT_DECK), { recursive: true })
  fs.mkdirSync(path.dirname(OUT_CREDITS), { recursive: true })

  const records = []
  const credits = []
  const failures = []

  for (const b of brands) {
    const colorPath = path.join(OUT_IMG_DIR, `${b.slug}.webp`)
    const monoPath = path.join(OUT_IMG_DIR, `${b.slug}.mono.webp`)
    const tiers = b.tiers || TIERS_DEFAULT
    const wantsMono = tiers.includes('hard')

    const skipColor = !FORCE && fs.existsSync(colorPath)
    const skipMono = !FORCE && (!wantsMono || fs.existsSync(monoPath))

    let meta = null
    let fileName = null

    try {
      if (skipColor && skipMono) {
        console.log(`= ${b.slug}: cached, skipping (use --force to refresh)`)
      } else {
        // Override: il curator può forzare uno specifico file Commons quando P154 punta
        // a un logo non desiderato (es. wordmark invece del glyph iconico, o logo con slogan).
        if (b.commonsFileOverride) {
          fileName = b.commonsFileOverride
          process.stdout.write(`→ ${b.slug}: override → ${fileName}\n`)
        } else {
          process.stdout.write(`→ ${b.slug} (${b.wikidata}): SPARQL... `)
          meta = await fetchLogoMeta(b.wikidata)
          if (!meta.ok) {
            throw new Error(`Wikidata ${b.wikidata} ha P154? ${meta.reason}`)
          }
          fileName = meta.fileName
          process.stdout.write(`${fileName}\n`)
        }

        process.stdout.write(`  download Commons... `)
        const buf = await downloadLogoBuffer(fileName)
        process.stdout.write(`${(buf.length / 1024).toFixed(1)} KB\n`)

        if (!skipColor) {
          await makeColor(buf, colorPath)
          console.log(`  ✓ ${path.relative(ROOT, colorPath)}`)
        }
        if (wantsMono && !skipMono) {
          await makeMonochrome(buf, monoPath)
          console.log(`  ✓ ${path.relative(ROOT, monoPath)}`)
        }
      }

      // Credits / record need license metadata. Se fileName non lo abbiamo (cached run),
      // usa override o ri-query SPARQL.
      if (!fileName) {
        if (b.commonsFileOverride) {
          fileName = b.commonsFileOverride
        } else {
          const m = await fetchLogoMeta(b.wikidata)
          if (m.ok) fileName = m.fileName
        }
      }
      let license = { license: 'unknown', artist: '', attribution: '' }
      if (fileName) license = await fetchLicense(fileName)

      records.push({
        id: `lgq_${String(records.length + 1).padStart(3, '0')}`,
        brand: b.brand,
        aliases: b.aliases || [],
        cluster: b.cluster,
        wikidata: b.wikidata,
        logo: {
          file: `/logoquiz/${b.slug}.webp`,
          width: TARGET_SIZE,
          height: TARGET_SIZE,
          format: 'webp',
          monochromeFile: wantsMono ? `/logoquiz/${b.slug}.mono.webp` : null,
        },
        source: {
          commonsFile: fileName ? `File:${fileName}` : null,
          license: license.license,
          fetched_at: new Date().toISOString(),
        },
      })

      credits.push({
        brand: b.brand,
        slug: b.slug,
        fileName,
        license: license.license,
        artist: license.artist,
        attribution: license.attribution,
      })
    } catch (err) {
      console.error(`✗ ${b.slug}: ${err.message}`)
      failures.push({ slug: b.slug, error: err.message })
    }
  }

  // ── Scrivi deck JSON ────────────────────────────────────────────────────
  fs.writeFileSync(OUT_DECK, JSON.stringify(records, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${records.length} records → ${path.relative(ROOT, OUT_DECK)}`)

  // ── Scrivi credits markdown ─────────────────────────────────────────────
  const creditsLines = [
    '# Logo Quiz — Credits',
    '',
    '> AUTO-GENERATED da `scripts/build-logoquiz-deck.mjs`. Non editare a mano.',
    '> I loghi sono scaricati da Wikimedia Commons e usati a scopo identificativo',
    '> (nominative fair use) nel quiz educativo Blob Party Logo Quiz.',
    '',
    '| Brand | File su Commons | Licenza | Autore |',
    '|---|---|---|---|',
    ...credits.map((c) =>
      `| ${esc(c.brand)} | ${c.fileName ? `[${esc(c.fileName)}](https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c.fileName)})` : '—'} | ${esc(c.license)} | ${esc(c.artist || c.attribution || '—')} |`,
    ),
    '',
  ]
  fs.writeFileSync(OUT_CREDITS, creditsLines.join('\n'), 'utf8')
  console.log(`Wrote credits → ${path.relative(ROOT, OUT_CREDITS)}`)

  if (failures.length) {
    console.warn(`\n${failures.length} failure(s):`)
    failures.forEach((f) => console.warn(`  - ${f.slug}: ${f.error}`))
    process.exitCode = 1
  }
}

function esc(s) {
  return (s || '').replace(/\|/g, '\\|')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
