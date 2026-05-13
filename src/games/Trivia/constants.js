// Costanti condivise del gioco Trivia: colori, label, config scoring.
// Centralizzate qui per evitare duplicazioni tra phase components.

// 8 categorie tematiche — trivia alcolico tra amici 🍻
export const TRIVIA_CATEGORIES = [
  { id: 'cocktail',  label: 'Cocktail',   emoji: '🍹', color: '#7C3AED' },
  { id: 'sbronze',   label: 'Sbronze',    emoji: '🥴', color: '#F59E0B' },
  { id: 'birra',     label: 'Birra&Vino', emoji: '🍺', color: '#16A34A' },
  { id: 'giochi',    label: 'Giochi',     emoji: '🎲', color: '#EF4444' },
  { id: 'vip',       label: 'VIP',        emoji: '⭐', color: '#EC4899' },
  { id: 'musica',    label: 'Musica',     emoji: '🎵', color: '#3B82F6' },
  { id: 'cinema',    label: 'Cinema',     emoji: '🎬', color: '#F97316' },
  { id: 'hot',       label: 'Hot',        emoji: '🌶️', color: '#06B6D4' },
]

export const getCategoryById = (id) =>
  TRIVIA_CATEGORIES.find((c) => c.id === id) ?? null

export const ANSWER_LABELS = ['A', 'B', 'C', 'D']

// Palette dei 4 tile risposta. Distintivi anche per chi è daltonico (label + posizione).
export const ANSWER_COLORS = ['#7C3AED', '#0891B2', '#D97706', '#DC2626']

export const PODIUM_EMOJIS = ['🥇', '🥈', '🥉']

// Mapping difficulty → moltiplicatore (allineato col server, vedi do_reveal/submit_answer).
export const DIFFICULTY_MULT = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
}

// Numero di stelle da disegnare per difficulty.
export const DIFFICULTY_STARS = {
  easy: 1,
  medium: 2,
  hard: 3,
}

// Label umani per i topic. Fallback al topic raw se non mappato.
export const TOPIC_LABEL = {
  birra: '🍺 Birra',
  business: '💰 Business',
  cinema: '🎬 Cinema',
  cocktail: '🍹 Cocktail',
  cultura: '🌍 Cultura',
  'curiosità': '🤔 Curiosità',
  dating: '💘 Dating',
  'drinking game': '🎲 Drinking Game',
  drink: '🍸 Drink',
  feste: '🎉 Feste',
  festival: '🎪 Festival',
  film: '🎬 Film',
  giochi: '🎲 Giochi',
  legge: '⚖️ Legge',
  locali: '🏙️ Locali',
  mixology: '🧊 Mixology',
  musica: '🎵 Musica',
  record: '🏅 Record',
  rockstar: '🎸 Rockstar',
  scandali: '🔥 Scandali',
  scienza: '🔬 Scienza',
  'serie tv': '📺 Serie TV',
  storia: '📜 Storia',
  tradizioni: '🍻 Tradizioni',
  vino: '🍷 Vino',
  'vip italiani': '🇮🇹 VIP Italiani',
}

export const topicLabel = (topic) => TOPIC_LABEL[topic] ?? topic ?? null
