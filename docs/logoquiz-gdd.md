# Logo Quiz — Game Design Document

> Stato: v1 (pianificazione 2026-05-18) · gameId `logoquiz`

---

## 1. Vision

Logo Quiz è il **terzo pilastro della categoria Quiz** insieme a Trivia (testo) e Movie Quiz
(emoji). Il giocatore vede un logo di brand reale, sceglie tra 4 opzioni, il primo che sa
a memoria identifica il marchio. **Riconoscimento visivo puro**: nessun testo, nessuna
trivia knowledge — solo "lo conosci o non lo conosci". È il quiz più democratico del set:
bambini, adulti, non-italiani giocano alla pari, perché i loghi sono lingua franca della
cultura pop globale.

### Pilastri
1. **Visual-only**: il logo è l'intera domanda. Niente testo aiuto, niente categoria visibile
   in question (la categoria orienta i distrattori sotto il cofano).
2. **Speed brutale**: 12s default (vs 15s Trivia). Il riconoscimento è istantaneo o non è.
3. **Distrattori sensati**: i 3 wrong sono dello stesso `cluster` (fast food, big tech,
   automotive, ecc.) — niente Coca-Cola tra Apple/Microsoft/Google.
4. **Replay value tramite presentation tier**: stesso logo può apparire in 3 forme — full
   color (easy), grayscale (medium), silhouette monocroma (hard). Il deck attinge tier
   pesati sulla difficoltà del round.
5. **Zero rischio legale a runtime**: tutti i loghi sono scaricati a build time da
   Wikimedia Commons (file pubblici), ottimizzati e shipped come asset statici. Nessuna
   dipendenza da CDN terzi in produzione.

### Anti-vision
- Non è "indovina il claim/slogan" — solo logo.
- Non è risposta libera: niente typing, niente fuzzy match (vedi §11 per il futuro).
- Non vuole essere Logos Quiz mobile-app spammy con 5000 brand random — pool **curato**
  di ~250 brand iconici, balanced per categoria e geografia.

---

## 2. Game Loop

```
┌──────────────────────────────────────────────────────────────────┐
│ LOBBY → DECK BUILT (slice + tier mix) → COUNTDOWN (4s) → ┐       │
│                                                          ↓       │
│          ┌──── QUESTION (12s, logo only) ────┐  ─── REVEAL ──┐   │
│          │                                   │                ↓   │
│          └────── tutti rispondono ───────────┘   host: AVANTI ─┐  │
│                                                                ↓  │
│   (round < total?) ◄──────────────────────────────────────────┘   │
│        │  no                                                      │
│        ↓                                                          │
│      FINAL (podio + MVP) → host: RIGIOCA / CAMBIA                 │
└──────────────────────────────────────────────────────────────────┘
```

### Durata
- **Countdown**: 4s (3-2-1-VIA, full screen)
- **Question**: **12s** default (range 8–20s settabile da lobby)
- **Reveal**: indefinito, host avanza (target 5–6s — il brand name è già rivelato, niente da leggere)
- **Default partita**: 10 loghi = ~3 min di gameplay attivo

### Mode di presentazione (difficulty tier del logo)
| Tier | Aspetto | Blur iniziale | Score multiplier | Quando appare |
|---|---|---|---|---|
| `easy` | Full color, sfondo bianco | 16 px → 0 | 1.0× | 60% dei round in mix "facile", 30% "bilanciato", 10% "brutale" |
| `medium` | Grayscale | 22 px → 0 | 1.2× | 15/30/40 |
| `hard` | Silhouette monocroma nera | 24 px → 0 | 1.5× | 5/20/40 |

Tier viene assegnato in fase di **deck build** sul client host, non è statico nel pool.

### Reveal progressivo (anti-lettura immediata)
Il logo non è mai mostrato in chiaro durante `question`: parte **pesantemente sfocato**
(CSS `filter: blur(Npx)`) e si nitidizza linearmente man mano che scende il timer.
A `t=0` il blur è al massimo (`startBlur` del tier), a `t=duration` è 0.

```
revealProgress = 1 − timeLeft / timerDuration            // 0..1
blurPx         = startBlur(tier) × (1 − revealProgress)  // px
```

Il timer è server-derived (`useServerTimer`), quindi **tutti i giocatori vedono la
stessa identica sfocatura** in ogni momento. La pressione di gara nasce qui:
- Rispondere presto → blur alto → più rischio + più `speed_bonus` (fino a +6)
- Aspettare → blur basso → meno rischio + meno bonus

In `reveal` il blur è forzato a 0 e si vede il logo full-color (anche se il round era
hard) — gratification visiva subito dopo la chiusura del round.

---

## 3. Scoring System

Stesso scheletro di Trivia (§3 trivia-gdd.md): speed + streak. Differenze: niente
`difficulty` lato pool (tutti i loghi sono equivalenti), il multiplier viene dal
**tier di presentazione** scelto al deck-build.

### Formula
```
points = (BASE + speed_bonus + streak_bonus) * tier_mult
```

| Componente | Valori | Note |
|---|---|---|
| `BASE` | 10 | Risposta corretta |
| `speed_bonus` | `round((1 - elapsed/timer) * 6)` | 0–6 — un punto in più di Trivia, premia il riflesso visivo |
| `streak_bonus` | `min((streak - 1) * 2, 10)` | 0 alla 1ª, +2 alla 2ª, … cap +10 alla 6ª |
| `tier_mult` | easy 1.0, medium 1.2, hard 1.5 | Dal `logo_tier` del round |

### Penalità
| Caso | Punti | Streak |
|---|---|---|
| Risposta sbagliata | 0 | azzerata |
| Timeout | 0 | azzerata |

### Range tipico per partita 10 round (mix tier 50/30/20)
- Casual (50% accuracy): ~90–140 pt
- Knower (80%, streak 3): ~220–320 pt
- Speed demon (90%, fast, streak 6): ~360–460 pt

---

## 4. Logo Pool

### 4.1 Schema deck (`src/data/questions/logoquiz.json`)
```json
{
  "id": "lgq_001",
  "brand": "Coca-Cola",
  "aliases": ["coca cola", "coke"],
  "cluster": "beverage",
  "wikidata": "Q2813",
  "logo": {
    "file": "/logoquiz/coca-cola.webp",
    "width": 400,
    "height": 400,
    "format": "webp",
    "monochromeFile": "/logoquiz/coca-cola.mono.webp"
  },
  "source": {
    "commonsFile": "File:Coca-Cola_logo.svg",
    "license": "Public domain (US, ineligible for copyright as text)",
    "fetched_at": "2026-05-18T..."
  }
}
```

Note:
- `aliases` resta nel deck anche se ora usiamo MC (utile per fase futura "risposta libera").
- `monochromeFile` è opzionale: presente solo se il brand entra nel pool con tier hard.
- `source` è metadata di provenance, non usato a runtime (utile per audit/credits).

### 4.2 Cluster (= categoria distrattori)
Cluster determinano **quali 3 distrattori** vengono mostrati con il logo corretto: solo
brand dello stesso cluster. Pool target di partenza:

| Cluster | Esempi | Target count |
|---|---|---|
| `tech` | Apple, Google, Microsoft, Meta, Netflix, Spotify | 30 |
| `fastfood` | McDonald's, Burger King, KFC, Subway, Domino's, Starbucks | 25 |
| `beverage` | Coca-Cola, Pepsi, Red Bull, Heineken, Nutella, Nesquik | 25 |
| `automotive` | Ferrari, BMW, Toyota, Tesla, Vespa, Ducati | 30 |
| `fashion` | Nike, Adidas, Gucci, Prada, Zara, H&M | 25 |
| `social_app` | TikTok, Instagram, Snapchat, Discord, Twitch, WhatsApp | 20 |
| `sport_club` | Juventus, Real Madrid, Lakers, NFL, Ferrari (F1), UEFA | 25 |
| `media_tv` | RAI, Sky, Disney, Netflix, HBO, Mediaset | 20 |
| `gaming` | PlayStation, Xbox, Nintendo, Steam, Pokémon, Roblox | 25 |
| `retail` | Amazon, IKEA, eBay, Esselunga, Coop, Conad | 25 |
| **TOTALE target** | | **250** |

> **Stato attuale (post-sessione 4): 52 brand** distribuiti su tutti i 10 cluster.
> Distribuzione reale: `tech 7, fashion 7, automotive 6, gaming 6, media_tv 5, retail 5,
> social_app 5, sport_club 5, fastfood 4, beverage 2`. Cluster con <4 brand (beverage)
> usano automaticamente distrattori cross-cluster dal `deckBuilder`.
> Target finale: 100 brand (10/cluster) → 250 a regime.

### 4.3 Logica deck building (client host, al `start_game`)
1. Scegli i cluster da includere (default: tutti; lobby può restringere)
2. Per ogni round in `numQuestions`:
   - Pesca un cluster con probabilità ~uniforme sui cluster disponibili
   - Pesca **1 corretto** + **3 distrattori** dallo stesso cluster (random, no replacement)
   - Assegna `tier` (easy/medium/hard) secondo la distribuzione del difficulty preset
   - Mescola la posizione del corretto in `answers[0..3]`, salva `correct: int`
3. Output: `Round[]` con `{logoId, tier, options:[brandId×4], correct, durationS}`

### 4.4 Pipeline di acquisizione immagini (build time)

**Script**: `scripts/build-logoquiz-deck.mjs` (Node ≥18, `fetch` + `sharp` per imaging).

Input curato: `scripts/logoquiz-brands.json` — array di oggetti `{slug, brand, aliases, cluster, wikidata}`
mantenuto a mano (è il punto di curation, niente magia automatica). Slug = kebab-case.

Flow per ogni brand:
1. **SPARQL su Wikidata** con QID del brand:
   ```sparql
   SELECT ?logo WHERE { wd:Q2813 wdt:P154 ?logo. }   -- P154 = logo image
   ```
   → ottieni il filename Commons (es. `Coca-Cola_logo.svg`)
2. **Download** da `https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=512`
   (l'endpoint fa il render del SVG a PNG 512px lato lungo; user-agent obbligatorio).
3. **Optimize** con sharp:
   - Resize fit=contain, sfondo bianco, output 400×400
   - Encode WebP q=85 → `public/logoquiz/{slug}.webp` (~10–30 KB)
   - Se il brand è marked `tiers: ["hard"]` o se è in top-10 popolarità → genera anche la
     variante monocroma: greyscale + threshold → silhouette nera su bianco → `{slug}.mono.webp`
4. **Cache + skip**: se `{slug}.webp` esiste e `--force` non passato, salta (incremental builds).
5. **Output**: `src/data/questions/logoquiz.json` aggiornato con record completi (incluso
   metadata `source` per traceability).

Comando: `npm run build:logoquiz` (script in `package.json` aggiunto:
`"build:logoquiz": "node scripts/build-logoquiz-deck.mjs"`).

**Sicurezza/legalità**:
- Logo testuali (es. Coca-Cola wordmark) sono PD-text in molte giurisdizioni.
- Loghi figurativi (es. Nike swoosh) sono trademark — uso nominativo per identificare il
  brand in un quiz educational è generalmente fair use. Il GDD richiede solo loghi presenti
  su Wikimedia Commons (community-vetted per licensing).
- File `docs/logoquiz-credits.md` viene rigenerato dalla pipeline: lista di tutti i loghi
  con licenza + link a Commons. Mostrato in app sotto "Crediti" del gioco.

### 4.5 TODO content
- [ ] Curare `scripts/logoquiz-brands.json` MVP a 100 brand (10/cluster, top icons globali + alcuni italiani)
- [ ] Verificare ogni Wikidata QID + che `P154` esista
- [ ] Decidere cluster italiani specifici (sport_club include Juve/Inter/Milan/Napoli; retail include Esselunga/Conad/Coop)
- [ ] Aggiungere `forbidden_cluster_mix` se due cluster sono troppo simili (es. tech+social_app)

---

## 5. Per-Player Aggregates

Stessi campi di Trivia §5, mantenuti in `gameState.lqScores`, `gameState.lqStreaks`,
`gameState.lqCorrectCount`, `gameState.lqBestStreak`, `gameState.lqTotalSpeedMs`. Prefisso
`lq*` per stare in line con `eq*` (EmojiQuiz) e non collidere con `triviaXxx`.

| Campo | Tipo | Significato |
|---|---|---|
| `score` (in `players[]`) | int | Punteggio totale, visibile in HUD |
| `lqStreaks[pid]` | int | Streak corrente |
| `lqBestStreak[pid]` | int | Record streak partita |
| `lqCorrectCount[pid]` | int | N° loghi indovinati |
| `lqTotalSpeedMs[pid]` | int | Somma tempi risposta sui corretti |
| `lqClusterStats[pid]` | `{cluster: {ok, total}}` | (Opzionale v2) per MVP "Specialista del cluster" |

---

## 6. Fasi e UI

### 6.1 Lobby — `logoquiz_lobby`
File: `src/screens/LogoQuizLobbyScreen.jsx` (replica struttura `EmojiQuizLobbyScreen.jsx`).
- Selector **N° loghi**: 5 / 10 / 15
- Selector **Tempo per logo**: 8s / 12s / 20s
- Selector **Mix difficoltà**: Facile (easy 80%) / Bilanciato (50/30/20) / Brutale (20/40/40)
- (v2) Selector **Cluster**: chip multi-select, default tutti attivi
- Stato salvato in `gameState.logoquizSession = { numLogos, durationS, mix, clusters }`
- Pulsante **Inizia** (solo host) → setPhase `logoquiz_countdown` + serializza deck in `gameState.logoquizDeck`

### 6.2 Countdown — `logoquiz_countdown`
Overlay 3 → 2 → 1 → VIA (4s, stesso componente di Trivia/EmojiQuiz).

### 6.3 Question — `logoquiz_question`
Layout verticale (mobile-first, 380px reference width):
- **AppHeader**: ← Esci · logo · `7/10` badge
- **GameHUD**: progress bar · timer ring · player chips con score
- **LogoCard** (nuovo componente):
  - Box quadrato bianco arrotondato, ombra morbida
  - `<img>` con `loading="eager"`, `decoding="async"`, `srcset` solo `.webp`
  - In modalità `medium`: CSS `filter: grayscale(100%)`
  - In modalità `hard`: usa `monochromeFile` se presente, fallback su filter `grayscale + contrast`
  - Nessun testo brand, nessun chip categoria (vedi pilastro 1)
- **Grid 2×2 risposte**: 4 tile (riuso `AnswerTile` di Trivia, già stilato a 4 colori)
  - Stato `localAnswer` come Trivia: tile evidenziato, altri 45% opacity
- **Status bar**: "🔒 Bloccata!" / "🐌 Troppo lento!" sotto la grid

### 6.4 Reveal — `logoquiz_reveal`
Layout uguale a Question ma:
- Logo torna full-color (anche se il round era hard) — gratification
- Tile corretto **verde**, altri attenuati; il tuo bordo rosso/verde
- **ScorePopup** centrale: `+24` (con tier_mult visibile come "×1.5 hard")
- **BrandRevealCard**: sotto il logo compare il nome brand + chip cluster + 1 riga di info
  (es. "Atlanta, USA · dal 1886") — minilezione di 2 secondi, sourced da Wikidata in build
- Footer: host `Avanti →` / altri "Aspettando il boss... 👑"

### 6.5 Final — `logoquiz_final`
Identico a Trivia/EmojiQuiz:
- Podio top 3
- Classifica completa
- 3 MVP Awards (§7)
- Host: `🎮 Cambia gioco` + `🔄 Rigioca`

---

## 7. MVP Awards (final)

| Award | Criterio | Empty state |
|---|---|---|
| 🏷️ **Brand Hunter** | Più `lqCorrectCount` (tie-break: speed_avg) | "Nessuno riconosce niente? 🙈" |
| 🔥 **Streak Master** | Più `lqBestStreak` (min 3) | "Niente streak degne" |
| ⚡ **Occhio di Falco** | `lqTotalSpeedMs / lqCorrectCount` più basso (min 3 corrette) | "Tutti lenti come la lumaca della Posta 🐌" |
| 🎯 **Specialista** (v2) | Cluster con accuracy ≥80% e ≥3 round | "Mai specializzati" |

---

## 8. Architettura tecnica

### 8.1 Modello sync — **per-player con host-resolve (stile EmojiQuiz)**
**Decisione**: differente da Trivia (server-authoritative via Postgres function).
Logo Quiz non ha bisogno di calcolo server: il deck è già noto a tutti dopo `start_game`,
il timer è server-derived, e la fase reveal è host-controlled.

- All'avvio host serializza il deck completo in `gameState.logoquizDeck` (push CDC → tutti)
- Ogni client tiene il proprio `myAnswer` locale → on submit invia
  `rpcCastVote(code, 'lqAnswers', playerId, { round, idx, ms })` (RPC esistente, generic)
- Host registra in `gameState.lqAnswers[round][pid]`; quando `keys(lqAnswers[round]).length === players.length` **oppure** timer scade → host calcola scoring → push `logoquiz_reveal`
- Idempotenza: client che inviano dopo lo scade vengono ignorati dall'host (round !== current)

Vantaggio vs Trivia-style: zero nuove Postgres functions da scrivere; riusiamo `rpcCastVote`
+ pattern `host computes on reveal` di EmojiQuiz/Scramble.

### 8.2 Timer
`useServerTimer(question_started_at, durationS)` come tutti gli altri — fonte di verità
unica = timestamp set dal `setPhaseWithTimer` dell'host.

### 8.3 Preload assets
- `useEffect` nel hook: quando `currentPhase ∈ {logoquiz_countdown, logoquiz_question}`,
  preload via `new Image(); img.src = url` dei **prossimi 2 loghi** del deck.
- Riduce drasticamente il rischio di "logo grigio per 200ms al cambio round" su 4G.

### 8.4 Edge cases di sync
| Caso | Comportamento |
|---|---|
| Client lento, logo non caricato a fine question | UI mostra "🌀 caricamento…" sotto il logo, ma countdown continua |
| Vote inviato 2× dal client | RPC `castVote` è LWW per `(round, pid)`, secondo update overwrite |
| Host esce a metà partita | (TODO comune a tutta l'app) Promozione automatica nuovo host |
| Player join a metà partita | `lqScores[pid]` lazy-init a 0; perde i round già giocati |
| Tutti i client perdono Realtime | Polling fallback (timer client scatta comunque, scoring resta consistente al rientro) |

---

## 9. File structure

```
src/games/LogoQuiz/
├── index.jsx                       # entry + phase routing (LogoQuizLobby, Question, Reveal, Final)
├── useLogoQuiz.js                  # state hook (analog. useEmojiQuiz)
├── constants.js                    # tier mults, durations, cluster labels (it)
├── deckBuilder.js                  # pickRounds(brands, opts) — pure function
├── scoring.js                      # computeRoundPoints({correct, ms, durationS, streak, tier})
├── phases/
│   ├── QuestionPhase.jsx
│   ├── RevealPhase.jsx
│   └── FinalPhase.jsx
└── components/
    ├── LogoCard.jsx                # immagine + filter per tier
    ├── BrandRevealCard.jsx         # nome + chip cluster + info-riga in reveal
    ├── AnswerTile.jsx              # OPPURE import shared da ../shared/AnswerTile.jsx
    ├── ScorePopup.jsx              # +X con tier mult
    └── MvpAwards.jsx               # 3 badge (può essere shared)

src/screens/
└── LogoQuizLobbyScreen.jsx

src/data/questions/
└── logoquiz.json                   # generato

public/logoquiz/
├── apple.webp
├── coca-cola.webp
├── coca-cola.mono.webp             # solo per brand con tier hard
└── …

scripts/
├── build-logoquiz-deck.mjs         # nuovo
└── logoquiz-brands.json            # curated input

docs/
├── logoquiz-gdd.md                 # questo
└── logoquiz-credits.md             # generato dalla pipeline (license attribution)
```

### Modifiche a file esistenti
- `src/data/games.js`: nuova entry `logoquiz` nella sezione `// ───── QUIZ ─────`, dopo `emojiquiz`.
  - Color scheme proposto: teal/emerald → `linear-gradient(145deg, #99F6E4 0%, #14B8A6 55%, #115E59 100%)`, shadow `rgba(20, 184, 166, 0.40)`
  - Emoji: 🏷️
- `src/stores/useSession.js`: nessuna modifica (uso fasi generiche).
- `src/lib/room.js`: nessuna RPC nuova (riuso `rpcCastVote`).
- `package.json`: script `build:logoquiz`.

---

## 10. Edge cases gestiti

| Caso | Comportamento |
|---|---|
| Logo SVG su Wikimedia ha sfondo trasparente | Pipeline forza sfondo bianco via sharp `flatten({background:'#fff'})` |
| Brand senza P154 su Wikidata | Skip in build, warning in console, brand non entra nel deck |
| Cluster con <4 brand attivi | Deck-builder dropa quel cluster automaticamente per quella partita |
| Stesso brand pescato 2× in partita | `pickRounds` usa no-replacement |
| Image fetch fallisce a runtime (404) | LogoCard mostra placeholder "?" + push errore in `lqAnswers` come timeout |
| Player risponde 2× nello stesso round | Secondo `castVote` viene scartato lato host (round già chiuso) |
| Numero brand totali < numLogos selezionati in lobby | Lobby clampa il selector a `min(N, brands.length)` |
| Tier hard ma `monochromeFile` mancante | Fallback a CSS `filter: grayscale(1) contrast(2)` |

---

## 11. Open questions / future

- **Risposta libera v2**: aggiungere un'opzione "modalità expert" dove invece dei 4 tile
  appare un input. Aliases già nel pool, manca solo fuzzy matcher (Levenshtein ≤2).
- **Cluster lockdown**: in lobby permettere "solo automotive" o "solo tech" per partite tematiche.
- **Logo morphing**: il logo appare prima a 5% di nitidezza poi sfuma gradualmente — chi
  buzza prima vince. Trasforma il gioco da MC a buzz-based.
- **Daily logo**: 1 logo al giorno, leaderboard globale (richiede una tabella `logoquiz_daily_scores`).
- **Brand italiani exclusive mode**: deck filtrato solo a brand IT (Esselunga, Vespa, Ferrari, RAI, …).
- **Crediti in-app**: schermata con licenze e link a Commons per ogni logo mostrato.
- **Performance**: se il pool cresce >500 brand, valutare lazy-load del `logoquiz.json` (~50KB tollerabili oggi).

---

## 12. Roadmap implementazione

1. ✅ **Pipeline + 10 brand seed** — `build-logoquiz-deck.mjs` con SPARQL → Commons → sharp,
   override `commonsFileOverride` per casi-limite, algoritmo silhouette via alpha channel.

2. ✅ **Game stub navigabile** — `src/games/LogoQuiz/` completo (index, hook, phases,
   LogoCard, BrandRevealCard) + `LogoQuizLobbyScreen.jsx` + registry in `games.js` +
   route in `App.jsx` + `LOBBY_PHASE`/`LOBBY_ROUTES`/`useRoomSync` aggiornati.

3. ✅ **Scoring + tier presentation** — `scoring.js` con formula completa
   `(BASE + speed_bonus + streak_bonus) * tier_mult`, `deckBuilder` con preset mix
   easy/balanced/brutal, `LogoCard` con filter per tier, `MvpAwards` (Brand Hunter /
   Streak Master / Occhio di Falco).

4. ✅ **Content scale + polish** — pool a **52 brand** in tutti i 10 cluster (auto-download
   da Wikimedia Commons, license attribution in `docs/logoquiz-credits.md`). Override per
   Instagram (wordmark vs glyph), McDonald's (slogan), RAI/HBO/PlayStation/Xbox/IKEA
   (P154 mancante o non-iconic), Discord/Twitch (filename Commons corretto).

### TODO content rimanenti per chiudere l'MVP a 100 brand
- **beverage** (2 → 10): aggiungere Pepsi, Heineken, Nutella, Sprite, Fanta, Schweppes,
  Nestlé, San Pellegrino con `commonsFileOverride` (P154 quasi sempre mancante per
  food brand su Wikidata).
- **fastfood** (4 → 10): Burger King, Domino's Pizza, Pizza Hut, Taco Bell, Wendy's, Dunkin'.
- **automotive** (6 → 10): Tesla, Lamborghini, Vespa, Ducati (Wikidata QID OK ma P154
  mancante; serve override file Commons).
- **fashion** (7 → 10): Gucci, Armani, Versace.
- **social_app** (5 → 10): Snapchat, Facebook, LinkedIn, Reddit, X/Twitter.
- **sport_club** (5 → 10): Real Madrid, Bayern, Manchester United, Liverpool, NBA, NFL.
- **media_tv** (5 → 10): Sky, Mediaset, CNN, ESPN, National Geographic.
- **gaming** (6 → 10): Pokémon, Roblox, Activision, Ubisoft.
- **retail** (5 → 10): Carrefour (no Free logo su Commons — skipped), Esselunga,
  Coop, Conad, Walmart.

Pipeline workflow per aggiungere un brand: (1) trovare la QID Wikidata, (2)
`npm run build:logoquiz -- --only <slug>`, (3) se `no_p154` cercare il file Commons via
`api.php?action=query&list=search&srsearch=...&srnamespace=6` e mettere
`commonsFileOverride`, (4) se silhouette degenere aggiungere `tiers: ["easy","medium"]`.
