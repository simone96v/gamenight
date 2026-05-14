// Vercel serverless: genera domande per TUTTE le categorie in UNA SOLA chiamata DeepSeek.
//
// Il client manda POST { categories: ["geografia","storia",...], countPerCategory: 10 }
// e riceve { decks: { geografia: [...], storia: [...], ... } }.
//
// Vantaggi rispetto a 10 chiamate singole:
//   - 1 cold start Vercel invece di 10
//   - 1 round trip OpenRouter invece di 10
//   - 1 inference LLM invece di 10
//   → da ~8-15s a ~3-5s totale

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
- 3 livelli di difficoltà: easy (cultura generale base), medium (conoscenza discreta), hard (fatti specifici ma non oscuri)
- topic: sottocategoria specifica (es. "calcio", "regioni", "pittura")
- Output: SOLO JSON valido, niente altro`

const CATEGORY_DESCRIPTIONS = {
  geografia: 'geografia italiana: regioni, città, fiumi, laghi, montagne, isole, confini, capoluoghi, province, parchi naturali',
  storia: 'storia d\'Italia: Impero Romano, Risorgimento, Guerre Mondiali, Repubblica, figure storiche, eventi chiave',
  sport: 'sport italiano: Serie A, Nazionale calcio, campioni olimpici, Formula 1, ciclismo, tennis, atleti famosi',
  musica: 'musica italiana: Sanremo, cantautori, pop/rap italiano, Eurovision, canzoni iconiche, opera',
  cinema: 'cinema e TV italiana: film cult, registi, attori italiani, Oscar, serie TV, Cinecittà',
  cucina: 'cucina italiana: piatti regionali, ingredienti DOP/IGP, ricette tradizionali, vini, formaggi, dolci',
  scienza: 'scienza italiana: scienziati, invenzioni, scoperte, università storiche, spazio, medicina, Nobel',
  arte: 'arte e cultura italiana: pittori, scultori, architetti, musei, monumenti, UNESCO, letteratura',
  attualita: 'attualità italiana: politica, economia, moda, brand italiani, tendenze, società',
  curiosita: 'curiosità sull\'Italia: record, tradizioni locali, primati mondiali, etimologie, feste tradizionali',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const { categories = [], countPerCategory: rawCount = 5 } = req.body || {}
  const apiKey = process.env.OPENROUTER_API_KEY

  // Clamp: max 10 per categoria per tenere il prompt snello e veloce
  const countPerCategory = Math.min(Math.max(rawCount, 3), 10)

  // Filtra solo categorie valide
  const validCats = categories.filter((c) => CATEGORY_DESCRIPTIONS[c])
  if (validCats.length === 0) {
    res.status(400).json({ error: 'no_valid_categories' })
    return
  }
  if (!apiKey) {
    res.status(200).json({ decks: {}, error: 'no_api_key' })
    return
  }

  const seed = Math.random().toString(36).slice(2, 8)
  const totalQuestions = validCats.length * countPerCategory

  // Costruisci la lista categorie per il prompt
  const catList = validCats.map((c) => `- "${c}": ${CATEGORY_DESCRIPTIONS[c]}`).join('\n')

  const userPrompt = `[seed:${seed}] Genera esattamente ${countPerCategory} domande per OGNUNA di queste ${validCats.length} categorie (totale ${totalQuestions} domande):

${catList}

REQUISITI:
- Domande CORTE (max 15 parole)
- Risposte CORTE (max 5-6 parole)
- FATTI REALI e VERIFICABILI sull'Italia
- Mai domande inventate o troppo di nicchia
- Mix di difficoltà per categoria: ~35% easy, ~40% medium, ~25% hard

JSON (un oggetto con le categorie come chiavi, ogni valore è un array di domande):
{"${validCats[0]}":[{"question":"...","answers":["...","...","...","..."],"correct":0,"difficulty":"easy","topic":"..."},...],${validCats.length > 1 ? `"${validCats[1]}":[...],...` : ''}}`

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://blobpartygames.vercel.app',
        'X-Title': 'Blob Party',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.95,
        max_tokens: Math.max(4000, totalQuestions * 80),
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      console.error('[batch]', resp.status, errText.slice(0, 200))
      res.status(200).json({ decks: {}, error: `ai_status_${resp.status}` })
      return
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      res.status(200).json({ decks: {}, error: 'parse_error' })
      return
    }

    // Valida e normalizza ogni categoria
    const decks = {}
    for (const catId of validCats) {
      const raw = Array.isArray(parsed[catId]) ? parsed[catId] : []
      decks[catId] = raw
        .filter((q) =>
          q
          && typeof q.question === 'string' && q.question.length > 10
          && Array.isArray(q.answers) && q.answers.length === 4
          && q.answers.every((a) => typeof a === 'string' && a.length > 0)
          && typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4,
        )
        .map((q, i) => ({
          id: `ai_${catId}_${Date.now()}_${i}`,
          question: q.question.trim(),
          answers: q.answers.map((a) => String(a).trim()),
          correct: q.correct,
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          topic: (typeof q.topic === 'string' && q.topic) ? q.topic.toLowerCase() : 'mix',
          category: catId,
        }))
    }

    res.status(200).json({ decks })
  } catch (err) {
    console.error('[batch]', err)
    res.status(200).json({ decks: {}, error: 'exception' })
  }
}
