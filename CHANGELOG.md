# Changelog

Tutti i cambiamenti notabili a BlobParty sono documentati qui.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), e questo
progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

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
