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

const SYSTEM_PROMPT = `Sei il game master di un trivia alcolico EPICO tra amici a una serata di bevute.
Il tuo obiettivo: generare domande ORIGINALI, DIVERTENTI e MAI BANALI ogni volta.

Regole ferree:
- Ogni domanda ha esattamente 4 risposte, con UNA SOLA risposta corretta
- Le risposte sbagliate devono essere plausibili E divertenti (no risposte ovviamente assurde)
- Tono: brillante, scanzonato, da serata con amici e drink in mano
- Metti creatività nelle domande: situazioni assurde, curiosità pazzesche, fatti incredibili ma veri
- Mescola domande di cultura generale a tema alcolico con chicche poco conosciute
- NON ripetere mai le solite domande classiche da quiz — inventa, sorprendi, fai ridere
- Difficoltà variata: ~30% easy, ~50% medium, ~20% hard
- Output: SOLO JSON valido, niente markdown, niente fences, niente preambolo`

const CATEGORY_DESCRIPTIONS = {
  cocktail: 'cocktail e mixology: ricette classiche (Negroni, Mojito, Spritz, Margarita...), ingredienti, tecniche di preparazione, storia dei cocktail, barman famosi, liquori e amari',
  sbronze: 'sbronze epiche e cultura del bere: record mondiali alcolici, storie assurde legate all\'alcol, effetti dell\'alcol sul corpo, rimedi per la sbornia, tradizioni di bevuta nel mondo, leggi assurde sull\'alcol',
  birra: 'birra e vino: marchi famosi (Peroni, Heineken, Moretti...), stili di birra (IPA, lager, stout...), vitigni, regioni vinicole, abbinamenti cibo-vino, processo di produzione, curiosità su birrifici e cantine',
  giochi: 'giochi alcolici e drinking games: regole di giochi come beer pong, king\'s cup, flip cup, centurion, Never Have I Ever, tradizioni di brindisi, sfide alcoliche, giochi da tavolo con penalità alcoliche',
  vip: 'VIP e scandali alcolici: celebrità famose per le loro sbronze, scandali etilici di star e politici, feste leggendarie, rockstar e i loro eccessi, storie di VIP italiani e internazionali legate all\'alcol',
  musica: 'musica e feste: canzoni iconiche da festa e da discoteca, artisti famosi per il party lifestyle, hit estive, club e locali leggendari, festival musicali, canzoni che parlano di alcol e feste',
  cinema: 'film e serie TV con scene alcoliche: film cult con scene di bevute (Hangover, Beerfest, Cocktail...), personaggi iconici bevitori, serie TV con temi alcolici, citazioni famose sul bere, scene di festa al cinema',
  hot: 'domande piccanti e imbarazzanti: situazioni da serata alcolica, flirt e approcci da ubriachi, storie di dating, confessioni da festa, domande su relazioni e situazioni imbarazzanti legate all\'alcol',
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

  // Seed random per forzare l'AI a generare domande diverse ogni volta
  const seed = Math.random().toString(36).slice(2, 8)

  const userPrompt = `[seed:${seed}] Genera ${count} domande ORIGINALI e FRESCHE di trivia per la categoria "${category}" (${CATEGORY_DESCRIPTIONS[category]}).

IMPORTANTE: queste domande devono essere UNICHE e MAI viste prima. Inventa domande creative, curiosità sorprendenti, fatti poco conosciuti. Sorprendi i giocatori!

Output JSON esattamente in questo schema:
{"questions":[{"question":"...","answers":["...","...","...","..."],"correct":0,"difficulty":"easy","topic":"..."}]}

- "correct" è l'indice 0-3 della risposta giusta (VARIA la posizione della risposta corretta, non metterla sempre in 0!)
- "difficulty": mix di "easy", "medium", "hard"
- "topic": una parola che descrive il sotto-tema
- Mescola la posizione della risposta corretta (a volte 0, a volte 1, 2, 3)
- Rendi le domande divertenti e coinvolgenti per un gruppo di amici`

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://blob-party-app.vercel.app',
        'X-Title': 'Blob Party',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
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
