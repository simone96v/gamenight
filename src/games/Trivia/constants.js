// Costanti condivise del gioco Trivia: colori, label, config scoring.
// Centralizzate qui per evitare duplicazioni tra phase components.

// 10 categorie generaliste — cultura, attualità e curiosità sull'Italia 🇮🇹
export const TRIVIA_CATEGORIES = [
  { id: 'geografia',  label: 'Geografia',  emoji: '🌍', color: '#059669' },
  { id: 'storia',     label: 'Storia',     emoji: '📜', color: '#B45309' },
  { id: 'sport',      label: 'Sport',      emoji: '⚽', color: '#16A34A' },
  { id: 'musica',     label: 'Musica',     emoji: '🎵', color: '#3B82F6' },
  { id: 'cinema',     label: 'Cinema&TV',  emoji: '🎬', color: '#F97316' },
  { id: 'cucina',     label: 'Cucina',     emoji: '🍝', color: '#DC2626' },
  { id: 'scienza',    label: 'Scienza',    emoji: '🔬', color: '#7C3AED' },
  { id: 'arte',       label: 'Arte',       emoji: '🎨', color: '#EC4899' },
  { id: 'attualita',  label: 'Attualità',  emoji: '📰', color: '#0891B2' },
  { id: 'curiosita',  label: 'Curiosità',  emoji: '🤔', color: '#F59E0B' },
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
  architettura: '🏛️ Architettura',
  arte: '🎨 Arte',
  attualita: '📰 Attualità',
  calcio: '⚽ Calcio',
  cinema: '🎬 Cinema',
  citta: '🏙️ Città',
  cucina: '🍝 Cucina',
  curiosita: '🤔 Curiosità',
  design: '✏️ Design',
  economia: '💰 Economia',
  festival: '🎪 Festival',
  fisica: '⚛️ Fisica',
  geografia: '🌍 Geografia',
  innovazione: '💡 Innovazione',
  invenzioni: '🔧 Invenzioni',
  letteratura: '📚 Letteratura',
  medicina: '🏥 Medicina',
  montagne: '🏔️ Montagne',
  monumenti: '🏛️ Monumenti',
  motorsport: '🏎️ Motorsport',
  musica: '🎵 Musica',
  natura: '🌿 Natura',
  olimpiadi: '🏅 Olimpiadi',
  pittura: '🖼️ Pittura',
  politica: '🏛️ Politica',
  record: '🏅 Record',
  regioni: '🗺️ Regioni',
  sanremo: '🎤 Sanremo',
  scienza: '🔬 Scienza',
  scultura: '🗿 Scultura',
  'serie tv': '📺 Serie TV',
  societa: '👥 Società',
  spazio: '🚀 Spazio',
  sport: '⚽ Sport',
  storia: '📜 Storia',
  tecnologia: '💻 Tecnologia',
  tennis: '🎾 Tennis',
  tradizioni: '🎭 Tradizioni',
  turismo: '✈️ Turismo',
  vini: '🍷 Vini',
}

export const topicLabel = (topic) => TOPIC_LABEL[topic] ?? topic ?? null
