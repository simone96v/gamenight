#!/usr/bin/env node
// Script per generare 100 domande per categoria via DeepSeek/OpenRouter.
// Uso: OPENROUTER_API_KEY=sk-or-... node scripts/generate-trivia.mjs
//
// Genera 1000 domande (100 × 10 categorie) e le salva in src/data/questions/trivia.json.
// Ogni batch chiede 25 domande per evitare limiti di token.

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'questions', 'trivia.json')

const API_KEY = process.env.OPENROUTER_API_KEY
if (!API_KEY) {
  console.error('❌ Imposta OPENROUTER_API_KEY come variabile d\'ambiente')
  process.exit(1)
}

const CATEGORIES = [
  { id: 'geografia', desc: 'geografia italiana: regioni, città, fiumi, laghi, montagne, isole, confini, capoluoghi, province, parchi naturali, paesaggi iconici, turismo' },
  { id: 'storia', desc: 'storia d\'Italia: dall\'Impero Romano al Risorgimento, le due Guerre Mondiali, la Repubblica, figure storiche italiane (Garibaldi, Cavour, Da Vinci...), eventi chiave, date importanti' },
  { id: 'sport', desc: 'sport italiano: Serie A, Nazionale di calcio, campioni olimpici, Formula 1, ciclismo (Giro d\'Italia), tennis, nuoto, pallavolo, atleti famosi italiani, vittorie e record' },
  { id: 'musica', desc: 'musica italiana: Sanremo, cantautori (Battisti, De André, Dalla...), pop italiano, rap italiano, Eurovision, canzoni iconiche, band famose, hit recenti, musica classica italiana (Verdi, Puccini)' },
  { id: 'cinema', desc: 'cinema e TV italiana: film cult italiani, registi (Fellini, Sorrentino, Ferreri...), attori famosi, Oscar italiani, serie TV italiane, programmi TV popolari, reality show, conduttori famosi' },
  { id: 'cucina', desc: 'cucina italiana: piatti regionali, ingredienti DOP/IGP, ricette tradizionali, vini italiani, formaggi, salumi, dolci tipici, pizza, pasta, prodotti italiani famosi nel mondo' },
  { id: 'scienza', desc: 'scienza e tecnologia italiana: scienziati italiani (Galileo, Fermi, Marconi, Meucci...), invenzioni italiane, scoperte scientifiche, università storiche, innovazione, spazio, medicina' },
  { id: 'arte', desc: 'arte e cultura italiana: pittori (Michelangelo, Caravaggio, Botticelli...), scultori, architetti, musei, monumenti, UNESCO, letteratura italiana (Dante, Manzoni, Pirandello...), teatro, opera' },
  { id: 'attualita', desc: 'attualità e società italiana: politica italiana recente, economia, moda (Milano Fashion Week, brand italiani), social media, tendenze, personaggi pubblici, eventi recenti, costume e società' },
  { id: 'curiosita', desc: 'curiosità e fatti sorprendenti sull\'Italia: record italiani, fatti poco conosciuti, tradizioni locali bizzarre, primati mondiali dell\'Italia, etimologie, superstizioni, dialetti, feste tradizionali' },
]

const SYSTEM_PROMPT = `Sei un autore di quiz per un gioco trivia generalista sull'Italia.

REGOLE FONDAMENTALI:
- Domande in ITALIANO, chiare e dirette
- Massimo 15 parole per domanda
- 4 risposte per domanda, UNA SOLA corretta
- Risposte brevi: massimo 5-6 parole ciascuna
- Le domande devono riguardare FATTI REALI e VERIFICABILI
- NON inventare fatti, persone o eventi
- Risposte sbagliate plausibili ma chiaramente errate per chi sa la risposta
- Varia la posizione della risposta corretta (0,1,2,3) in modo uniforme
- NO domande troppo di nicchia: devono essere accessibili a un pubblico generale
- 3 livelli di difficoltà:
  * easy: fatti noti, cultura generale base
  * medium: richiede conoscenza discreta
  * hard: fatti specifici ma non oscuri
- Distribuisci: ~35 easy, ~40 medium, ~25 hard
- topic: sottocategoria specifica (es. "calcio", "regioni", "pittura")
- Output: SOLO JSON valido, niente altro testo`

const BATCH_SIZE = 25
const BATCHES_PER_CAT = 4

async function generateBatch(category, batchNum) {
  const seed = Math.random().toString(36).slice(2, 10)
  const prompt = `[seed:${seed}][batch:${batchNum + 1}/${BATCHES_PER_CAT}] Genera esattamente ${BATCH_SIZE} domande per la categoria "${category.id}" (${category.desc}).

IMPORTANTE:
- Domande DIVERSE tra loro, NON ripetere concetti
- Batch ${batchNum + 1}: copri aspetti DIVERSI della categoria
- Fatti REALI e VERIFICABILI sull'Italia
- Mix di difficoltà: ~9 easy, ~10 medium, ~6 hard

JSON:
{"questions":[{"question":"...","answers":["...","...","...","..."],"correct":0,"difficulty":"easy","topic":"..."}]}`

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://blobpartygames.vercel.app',
      'X-Title': 'Blob Party - Question Generation',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`API error ${resp.status}: ${errText.slice(0, 200)}`)
  }

  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content ?? ''

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    console.warn(`  ⚠️ Parse error batch ${batchNum + 1}, skipping`)
    return []
  }

  const raw = Array.isArray(parsed) ? parsed
    : Array.isArray(parsed.questions) ? parsed.questions
    : Array.isArray(parsed.data) ? parsed.data
    : []

  return raw.filter((q) =>
    q
    && typeof q.question === 'string' && q.question.length > 10
    && Array.isArray(q.answers) && q.answers.length === 4
    && q.answers.every((a) => typeof a === 'string' && a.length > 0)
    && typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4
  )
}

async function main() {
  console.log('🎯 Generazione 1000 domande trivia via DeepSeek...\n')
  const allQuestions = []

  for (const cat of CATEGORIES) {
    console.log(`📂 ${cat.id.toUpperCase()} — generando ${BATCH_SIZE * BATCHES_PER_CAT} domande...`)
    const catQuestions = []

    for (let b = 0; b < BATCHES_PER_CAT; b++) {
      process.stdout.write(`  Batch ${b + 1}/${BATCHES_PER_CAT}... `)
      try {
        const qs = await generateBatch(cat, b)
        console.log(`✅ ${qs.length} domande`)
        catQuestions.push(...qs)
      } catch (err) {
        console.log(`❌ ${err.message}`)
      }
      // rate limiting
      if (b < BATCHES_PER_CAT - 1) await new Promise((r) => setTimeout(r, 1500))
    }

    // deduplicate and format
    const seen = new Set()
    const unique = catQuestions.filter((q) => {
      const key = q.question.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const formatted = unique.slice(0, 100).map((q, i) => ({
      id: `${cat.id.slice(0, 3)}_${String(i + 1).padStart(3, '0')}`,
      question: q.question.trim(),
      answers: q.answers.map((a) => String(a).trim()),
      correct: q.correct,
      category: cat.id,
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      topic: (typeof q.topic === 'string' && q.topic) ? q.topic.toLowerCase().trim() : cat.id,
    }))

    console.log(`  → ${formatted.length} domande uniche salvate\n`)
    allQuestions.push(...formatted)
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(allQuestions, null, 2), 'utf-8')
  console.log(`\n✅ Salvate ${allQuestions.length} domande in ${OUT_PATH}`)
}

main().catch((err) => {
  console.error('❌ Errore fatale:', err)
  process.exit(1)
})
