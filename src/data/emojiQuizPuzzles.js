// Puzzle bank di Emoji Quiz.
// Ogni puzzle: { id, emoji, title, category, difficulty (1–3), hint, answers[] }.
// `answers[]` contiene tutte le varianti accettate (italiano, inglese, abbreviazioni).
// La match è fuzzy (Levenshtein ≤ 2) — vedi `src/games/EmojiQuiz/matching.js`.
//
// In Fase 3 questo file verrà sostituito da una tabella Supabase `emoji_puzzles`.

export const PUZZLES = [
  { id: 'p1',  emoji: '🦁👑',      title: 'Il Re Leone',             category: 'Film',    difficulty: 1, hint: 'Cartone Disney ambientato nella savana', answers: ['il re leone', 're leone', 'lion king'] },
  { id: 'p2',  emoji: '🚢🧊💔',    title: 'Titanic',                 category: 'Film',    difficulty: 1, hint: 'Una nave, un iceberg, 1997',              answers: ['titanic'] },
  { id: 'p3',  emoji: '👻🔫',      title: 'Ghostbusters',            category: 'Film',    difficulty: 2, hint: 'Chi chiamerai?',                          answers: ['ghostbusters', 'acchiappafantasmi'] },
  { id: 'p4',  emoji: '🐠🔍',      title: 'Alla ricerca di Nemo',    category: 'Film',    difficulty: 1, hint: 'Un pesce pagliaccio si perde nell\'oceano', answers: ['alla ricerca di nemo', 'nemo', 'finding nemo'] },
  { id: 'p5',  emoji: '🧙‍♂️💍🌋',  title: 'Il Signore degli Anelli', category: 'Film',    difficulty: 2, hint: 'Un anello da gettare nel Monte Fato',     answers: ['il signore degli anelli', 'signore degli anelli', 'lord of the rings'] },
  { id: 'p6',  emoji: '🦖🏝️',      title: 'Jurassic Park',           category: 'Film',    difficulty: 2, hint: 'Un parco con dinosauri clonati',          answers: ['jurassic park'] },
  { id: 'p7',  emoji: '🤖🌱❤️',    title: 'WALL·E',                  category: 'Film',    difficulty: 2, hint: 'Un robottino spazzino innamorato',        answers: ['wall-e', 'walle', 'wall e'] },
  { id: 'p8',  emoji: '👽📞🏠',    title: 'E.T.',                    category: 'Film',    difficulty: 2, hint: '«Telefono... casa»',                      answers: ['e.t.', 'et', 'extra terrestre', 'et l\'extraterrestre'] },
  { id: 'p9',  emoji: '🃏🤡',      title: 'Joker',                   category: 'Film',    difficulty: 2, hint: 'L\'origine di un villain di Gotham',       answers: ['joker'] },
  { id: 'p10', emoji: '❄️👸⛄',    title: 'Frozen',                  category: 'Film',    difficulty: 1, hint: 'Due sorelle e un pupazzo di neve',        answers: ['frozen', 'il regno di ghiaccio', 'regno di ghiaccio'] },
  { id: 'p11', emoji: '🐭👨‍🍳🍝',  title: 'Ratatouille',             category: 'Film',    difficulty: 2, hint: 'Un topo che cucina a Parigi',             answers: ['ratatouille'] },
  { id: 'p12', emoji: '🏴‍☠️💀⚓',  title: 'Pirati dei Caraibi',      category: 'Film',    difficulty: 2, hint: 'Il capitano è Jack Sparrow',              answers: ['pirati dei caraibi', 'pirates of the caribbean'] },
  { id: 'p13', emoji: '👶🦈',      title: 'Baby Shark',              category: 'Canzone', difficulty: 1, hint: 'Tormentone per bambini, doo doo doo',     answers: ['baby shark'] },
  { id: 'p14', emoji: '👁️🐅',      title: 'Eye of the Tiger',        category: 'Canzone', difficulty: 2, hint: 'Il tema musicale di Rocky',               answers: ['eye of the tiger', 'occhio della tigre'] },
  { id: 'p15', emoji: '💃🪩👑',    title: 'Dancing Queen',           category: 'Canzone', difficulty: 3, hint: 'Una hit intramontabile degli ABBA',        answers: ['dancing queen'] },
  { id: 'p16', emoji: '🌧️💜',      title: 'Purple Rain',             category: 'Canzone', difficulty: 3, hint: 'Brano iconico di Prince',                 answers: ['purple rain'] },
  { id: 'p17', emoji: '🚀👨‍🚀',    title: 'Rocket Man',              category: 'Canzone', difficulty: 3, hint: 'Un classico spaziale di Elton John',      answers: ['rocket man', 'rocketman'] },
]

// Mescola e prende `count` puzzles per la sessione (deterministic se serve seed in Fase 3).
export const pickDeck = (count, rng = Math.random) => {
  const a = [...PUZZLES]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, count)
}
