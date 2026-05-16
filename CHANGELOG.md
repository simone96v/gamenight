# Changelog

Tutti i cambiamenti notabili a BlobParty sono documentati qui.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), e questo
progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

## [0.2.3] — 2026-05-16

### Changed — Copy del bottone "fine partita" in solo
Il bottone della reveal phase all'ultima domanda diceva "Chi ha vinto?! 🏆"
(Trivia / Emoji Quiz) o "Classifica finale 🏆" (Mappa) anche in modalità solo,
ma in solo non c'è un avversario. Sostituito con **"Scopri il tuo risultato 🎯"**
quando `mode === 'local'`. Comportamento online invariato.

Files toccati: `EmojiQuizRevealPhase.jsx`, `Trivia/phases/RevealPhase.jsx`,
`Mappa/components/MappaReveal.jsx` (nuovo prop `isOnline` passato dai rispettivi
`index.jsx`).

## [0.2.2] — 2026-05-16

### Changed — Schermata di fine partita semplificata in single-player

In modalità solo (`mode === 'local'`) la classifica finale era ridondante (un solo
giocatore). Sostituita con `SoloResultScreen` in tutti i giochi:
- **Emoji Quiz**: punti totali + stat "Indovinate" + numero round (se >1)
- **Trivia**: punti totali + stat "Corrette" + numero round (se sessionMode)
- **Mappa (Indovina Dove)**: punti totali + stat "Luoghi"
- **Blob Jump**: metri raggiunti
- **Sentenza / NeverHaveI**: non hanno modalità solo, nessuna modifica

La schermata mostra:
- Emoji del gioco + titolo
- Blob del giocatore con il suo nome
- Numero principale gigante + etichetta (punti / metri / ...)
- Stat chip secondari (opzionali)
- Due bottoni: **🎮 Cambia gioco** (secondario) + **🔄 Rigioca** (primario, accent)

La classifica completa con podio resta in multiplayer.

### Internal
- Nuovo componente condiviso `src/components/SoloResultScreen.jsx` usa CSS
  variables + `usePlayerAccent` → coerente con light/dark mode + colore del player.
- Branching in ogni `index.jsx`: `if (!isOnline) return <SoloResultScreen ... />`
  prima del fallback alla `FinalPhase` multiplayer.

## [0.2.1] — 2026-05-16

### Fixed
- **Bug categoria badge** in EmojiQuizCard: mostrava "Canzone" come fallback per
  qualsiasi categoria non-Film (es. videogiochi mostrava "🎵 Canzone"). Ora usa
  lookup da `EMOJI_QUIZ_CATEGORIES` e mostra label + emoji + colore corretti per
  ogni categoria (film, canzoni, serie_tv, videogiochi, marchi). Normalizzazione
  di valori legacy DB ('Film' → 'film', 'Canzone' → 'canzoni').

### Changed — Lobby Emoji Quiz: ruota stile Trivia + sessione multi-round
Sostituiti i chip statici della categoria con `CategoryWheel` come Trivia:
- **Ruota** con 5 categorie reali (esclusa "Tutte"): lo spinner del round la
  fa girare, l'animazione è sincronizzata fra host e client via Realtime
  (`gameState.eqSession.spinTarget`).
- **Stepper Round** (1-3): numero di volte che la ruota viene girata.
- **Stepper Domande** (5-15): puzzle giocati per ogni round.
- **Spinner deterministico**: scelto per round con seed = roomCode + roundIdx,
  ruota fra i player.
- **Multi-round flow**: tra round la final phase mostra "Prossimo round →"
  che riporta in lobby per la prossima ruota. All'ultimo round → "Rigioca".
- **Anti-repeat per categoria**: categorie già giocate vengono escluse dalla
  ruota nei round successivi.
- **Punteggi cumulativi** attraverso i round (mai resettati fra round, solo
  all'inizio della partita o su "Rigioca").

### Internal
- `useEmojiQuiz` ristrutturato: `gameState.eqSession` (roundIdx, totalRounds,
  questionsPerRound, categoriesPlayed, currentCategory, spinTarget, launching)
  + `hostNextRound()` per la transizione fra round.
- `handleRequestSpin` nella lobby pusha direttamente (non via updateSession,
  che è gated su canControl) per permettere a chiunque sia spinner — anche
  non-host — di triggerare la ruota.

## [0.2.0] — 2026-05-16

### Changed — Pool unificato + categorie + difficoltà per Emoji Quiz e Mappa

Applicato il pattern di Trivia a tutti i giochi: **pool grande**, **lazy load
istantaneo**, **categorie filtrabili in lobby**, **anti-repeat** localStorage.

#### Emoji Quiz
- **Pool 17 → 111 puzzle** (5 categorie × 3 difficoltà):
  - 🎬 Film: 30 puzzle (Disney, classici, blockbuster, italiani)
  - 🎵 Canzoni: 25 (italiane + internazionali, classiche + recenti)
  - 📺 Serie TV: 20 (Netflix, Sky, italiane)
  - 🎮 Videogiochi: 18 (Mario, Pokémon, Fortnite, ...)
  - 🏷️ Marchi: 18 (Apple, Coca Cola, Nike, ...)
- **Bundle JSON** (`src/data/questions/emojiquiz.json`) caricato lazy come
  Trivia → ZERO query Supabase a runtime, ZERO cold start.
- **Anti-repeat localStorage** (`gn:emojiquiz:seen:<categoria>`, cap 80)
  per evitare ripetizioni fra partite consecutive.
- **Lobby**: selettore categoria (6 chip incluso "Tutte") + selettore round
  (5/7/10/15). Sincronizzati in online via gameState.
- **Supabase `emoji_puzzles` table**: deprecato l'accesso a runtime
  (rimane in DB per migration history). Il loader ora usa solo il bundle.
- Rimosso `src/data/emojiQuizPuzzles.js` (fallback obsoleto).

#### Mappa
- **Lazy loader** (`src/lib/mappaDeck.js`) speculare a `emojiQuizDeck` e
  `aiQuestions` — niente più import statico di mappa.json in index.jsx.
- **Anti-repeat localStorage** (`gn:mappa:seen:<difficolta>`, cap 90).
- **Selettore difficoltà** in lobby: Mix / 🟢 Facile (20) / 🟡 Medio (39) /
  🔴 Difficile (66). Sincronizzato online.
- Replay e start usano lo stesso `loadMappaDeck(rounds, difficulty)` →
  no logic duplication.

#### Trivia
- Nessun cambiamento (era già su questo pattern).

### Performance
- Emoji Quiz e Mappa ora hanno chunk separati lazy:
  - `emojiquiz-*.js`: 19.54 KB / 6.04 KB gzip (pool JSON)
  - `mappa-*.js`: 24.31 KB / 8.70 KB gzip (pool JSON)
- Caricati solo quando si entra nel rispettivo gioco — initial bundle invariato.

## [0.1.2] — 2026-05-16

### Changed — Meccanica Emoji Quiz: ritorno al text input + indizio

Revertita la scelta multipla. Si torna alla meccanica originale del prototipo
(input testuale libero + matching fuzzy) ma **mantenendo il design system
dell'app** introdotto in v0.1.1 (AppHeader, GameHUD, CSS variables, light/dark,
player accent, niente audio).

- **Input testuale**: l'utente digita il titolo nel campo "Scrivi il titolo…"
  e preme Indovina (o Enter). Matching fuzzy (Levenshtein, normalizzazione
  Unicode, stopwords).
- **Bottone indizio**: "💡 Usa un indizio (−punti)". Cliccando, appare
  immediatamente il testo dell'indizio sotto la card emoji. Il bottone cambia
  in "💡 Indizio usato · punti ridotti". I punti massimi del round vengono
  cappati a 350 (vs 800 senza indizio).
- **Wrong-guess feedback**: input shake + flash rosso, l'input si svuota,
  nessuna penalità — si può continuare a tentare finché il timer non scade.
- **Reveal phase** riprogettata: card grande con il titolo corretto + chip
  con avatar dei giocatori che hanno indovinato (👑 sul vincitore del round) +
  tempo di risposta. Niente più 4 tile risposta.

### Restored
- `src/games/EmojiQuiz/matching.js` (normalize / lev / isCorrect).

### Internal
- `scoring.js`: ripristinato il parametro `hintUsed` in `basePoints()`.
- `loadEmojiQuizDeck()`: rimossa la generazione di distractor (non più
  necessari) — torna a esporre `answers[]` (varianti accettate).
- `gameState.eqRoundAnswers`: ora `{ pid: { round, timeMs, hintUsed } }`
  (solo guess corretti).
- `gameState.eqHintUsed`: `{ pid: { round, used } }` (tracking dell'hint
  per il computing dei punti).
- Test Playwright aggiornati per il flow text-input + hint.

## [0.1.1] — 2026-05-16

### Changed — UI di Emoji Quiz riallineata al design system dell'app

Refactoring sostanziale della UI di Emoji Quiz per coerenza con gli altri giochi.

- **Meccanica**: text-input fuzzy → **4 risposte multiple** (1 corretta + 3
  distractor generati a runtime dagli altri titoli del puzzle bank).
- **Layout**: scoped CSS-in-JS (palette neon viola) → `AppHeader` + `GameHUD`
  + `EmojiQuizCard` + griglia 2×2 di `AnswerTile` (riusato da Trivia).
  Identico in struttura a Trivia.
- **Colori**: palette fissa → CSS variables (`--bg`, `--surface`, `--text`,
  `--accent`, ...). Funziona in light e dark mode senza intervento.
- **Player accent**: usa `usePlayerAccent()` per ricavare il colore dal player
  locale, come tutti gli altri giochi.
- **Top bar**: aggiunta `AppHeader` con back button (host) e `RoundBadge`.
- **Audio rimosso**: eliminato il modulo `sound.js` e il toggle 🔊.
- **Bot rimosso**: nessun avversario simulato in single-player; il solo è una
  pratica come Trivia solo (un giocatore, 7 round, score finale).
- **Indizio rimosso** per coerenza con Trivia.

### Removed
- `src/games/EmojiQuiz/sound.js`
- `src/games/EmojiQuiz/styles.js`
- `src/games/EmojiQuiz/matching.js` (non serve, le risposte sono ora multiple
  choice — l'indice del tile cliccato è sufficiente).
- `BlobAvatar.jsx`, `Confetti.jsx`, `EmojiQuizHome.jsx`,
  `EmojiQuizPlaying.jsx`, `EmojiQuizRoundEnd.jsx`, `EmojiQuizGameEnd.jsx`
  (sostituiti dalle phase Trivia-styled).

### Added
- `EmojiQuizCard.jsx` (emoji centrale + categoria + difficoltà).
- `EmojiQuizQuestionPhase.jsx`, `EmojiQuizRevealPhase.jsx`,
  `EmojiQuizFinalPhase.jsx` (mirroring `Trivia/phases/*`).

### Internal
- Lobby online ora supporta anche solo (`minPlayers: 1` in solo, 2 in online).
- `SoloGamesScreen.LOBBY_ROUTES.emojiquiz` punta a `/emojiquiz-lobby` (prima
  saltava la lobby).
- Schema `gameState` riallineato: `eqRoundAnswers` rimpiazza `eqGuesses`
  (ora `{ pid: { round, chosen: int, timeMs } }`), aggiunto `eqCorrectCount`
  per la leaderboard.
- Test Playwright aggiornati per la nuova UI (selettori basati su
  `aria-label="Difficoltà N/3"` + role button).

## [0.1.0] — 2026-05-16

### Added — Nuovo minigame: Emoji Quiz 🎬

Aggiunto il sesto minigame: **Emoji Quiz** — decifra il titolo di un film o
canzone nascosto dietro a una sequenza di emoji. Il primo che indovina vince.

- **Single-player** (modalità solo): 7 round contro il bot Blobby con difficoltà
  scalata sulla complessità del puzzle. Combo moltiplicatore fino a ×2.0 per
  vincite consecutive. Indizio opzionale (riduce i punti massimi a 350).
- **Multiplayer** (2-8 giocatori online): modello host-client su Supabase Realtime.
  L'host carica il deck, orchestra le transizioni di fase, valida i guess e
  arbitra il winner del round confrontando i `timeMs` (non l'ordine d'arrivo dei
  pacchetti). I client validano il guess localmente e inviano via
  `castVote('eqGuesses', { round, timeMs })`.
- **Puzzle bank** spostato dal bundle locale a una tabella Supabase `emoji_puzzles`
  (migration in `scripts/sql/emoji_quiz_setup.sql`). Seed iniziale: 17 puzzle
  (12 film + 5 canzoni). Fallback automatico al bundle locale se la tabella
  non è ancora applicata.
- **Matching fuzzy** con normalizzazione Unicode (NFD, no diacritici, no
  stopwords) e distanza di Levenshtein ≤ 2 (≤ 1 per stringhe ≤ 4 caratteri).
- **Punteggio**: `150 + (timeLeft/total) × 650`, con cap a 350 quando si usa
  l'indizio. Moltiplicatore combo `1.0 → 2.0` partendo da streak ≥ 2.
- **UI scalabile**: layout 1v1 (Tu vs Blobby/Leader) durante il gioco; podio
  top 3 + leaderboard estesa per N>3 giocatori nello schermo finale.
- **Audio** Web Audio scoped (zero dipendenze), togglabile con il pulsante 🔊.

### Tests
- Aggiunto Playwright (`@playwright/test`) come dev dependency.
- Script npm: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`.
- Due spec end-to-end:
  - `tests/e2e/emojiquiz-solo.spec.js`: percorso single-player completo.
  - `tests/e2e/emojiquiz-multi.spec.js`: due browser context creano una stanza
    reale, votano Emoji Quiz, l'host avvia, entrambi vedono lo stesso emoji
    (verifica della sincronizzazione del deck).

### Fixed
- Transizione `emojiquiz_countdown → emojiquiz_playing` ora event-driven via
  `CountdownOverlay.onComplete` invece di `setTimeout(3000)`, evitando il
  problema del double-mount di React StrictMode in dev che cancellava il
  timer prima del firing.
