// Vercel serverless function: genera N domande di trivia in italiano via OpenRouter.
//
// Setup:
//   1. Iscriviti su openrouter.ai
//   2. Genera una API key (Keys → Create Key)
//   3. Vercel dashboard → blob-party project → Settings → Environment Variables:
//      - OPENROUTER_API_KEY = "sk-or-v1-xxxxxx..." (tutti gli environment)
//
// Senza la env var ritorna { questions: [], error: 'no_api_key' } e il client
// fa fallback al pool locale.

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
  geografia: 'geografia italiana: regioni, città, fiumi, laghi, montagne, isole, confini, capoluoghi, province, parchi naturali, paesaggi iconici, turismo',
  storia: 'storia d\'Italia: dall\'Impero Romano al Risorgimento, le due Guerre Mondiali, la Repubblica, figure storiche italiane, eventi chiave, date importanti',
  sport: 'sport italiano: Serie A, Nazionale di calcio, campioni olimpici, Formula 1, ciclismo, tennis, nuoto, pallavolo, atleti famosi italiani, vittorie e record',
  musica: 'musica italiana: Sanremo, cantautori, pop italiano, rap italiano, Eurovision, canzoni iconiche, band famose, musica classica italiana, opera',
  cinema: 'cinema e TV italiana: film cult, registi famosi, attori italiani, Oscar, serie TV italiane, programmi TV popolari, conduttori famosi, Cinecittà',
  cucina: 'cucina italiana: piatti regionali, ingredienti DOP/IGP, ricette tradizionali, vini, formaggi, salumi, dolci tipici, pizza, pasta, caffè',
  scienza: 'scienza e tecnologia italiana: scienziati italiani, invenzioni, scoperte scientifiche, università storiche, innovazione, spazio, medicina, Nobel italiani',
  arte: 'arte e cultura italiana: pittori, scultori, architetti, musei, monumenti, UNESCO, letteratura italiana, teatro, opera, design',
  attualita: 'attualità e società italiana: politica, economia, moda, brand italiani, social media, personaggi pubblici, tendenze, costume e società',
  curiosita: 'curiosità e fatti sorprendenti sull\'Italia: record italiani, tradizioni locali, primati mondiali, etimologie, superstizioni, dialetti, feste tradizionali',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const { category, count = 10 } = req.body || {}
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!CATEGORY_DESCRIPTIONS[category]) {
    res.status(400).json({ error: 'invalid_category' })
    return
  }
  if (!apiKey) {
    res.status(200).json({ questions: [], error: 'no_api_key' })
    return
  }

  const seed = Math.random().toString(36).slice(2, 8)

  const userPrompt = `[seed:${seed}] Genera ${count} domande per "${category}" (${CATEGORY_DESCRIPTIONS[category]}).

REQUISITI:
- Domande CORTE (max 15 parole). Esempio: "Qual è il capoluogo della Toscana?"
- Risposte CORTE (max 5-6 parole). Esempio: "Firenze"
- USA fatti REALI e VERIFICABILI sull'Italia
- Mai domande inventate o troppo di nicchia
- Mix di difficoltà: ~35% easy, ~40% medium, ~25% hard

JSON:
{"questions":[{"question":"...","answers":["...","...","...","..."],"correct":0,"difficulty":"easy","topic":"..."}]}`

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
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.error('[openrouter]', resp.status, errText.slice(0, 200))
      res.status(200).json({ questions: [], error: `ai_status_${resp.status}` })
      return
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      res.status(200).json({ questions: [], error: 'parse_error' })
      return
    }

    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : Array.isArray(parsed.data)
          ? parsed.data
          : []

    const questions = raw
      .filter((q) =>
        q
        && typeof q.question === 'string' && q.question.length > 10
        && Array.isArray(q.answers) && q.answers.length === 4
        && q.answers.every((a) => typeof a === 'string' && a.length > 0)
        && typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4,
      )
      .map((q, i) => ({
        id: `ai_${category}_${Date.now()}_${i}`,
        question: q.question.trim(),
        answers: q.answers.map((a) => String(a).trim()),
        correct: q.correct,
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        topic: (typeof q.topic === 'string' && q.topic) ? q.topic.toLowerCase() : 'mix',
        category,
      }))

    res.status(200).json({ questions })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[openrouter]', err)
    res.status(200).json({ questions: [], error: 'exception' })
  }
}
