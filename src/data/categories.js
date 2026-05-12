// Definizione delle 4 categorie selezionabili dalla HomeScreen.
// `ageWarning: true` attiva la AgeModal prima di entrare.
// `color` è usato per il theming della tile della categoria.

export const CATEGORIES = [
  {
    id: 'gamenight',
    name: 'Game Night',
    emoji: '🎮',
    tagline: 'Sfide, punti, nessuna pietà',
    color: '#7C3AED',
    ageWarning: false,
  },
  {
    id: 'bar',
    name: 'Serata al bar',
    emoji: '🍺',
    tagline: 'Classici da pub, nessuna scusa',
    color: '#F59E0B',
    ageWarning: false,
  },
  {
    id: 'couple',
    name: 'Solo noi due',
    emoji: '🔥',
    tagline: 'Per conoscersi davvero',
    color: '#EC4899',
    ageWarning: true,
  },
  {
    id: 'wild',
    name: 'Verità o conseguenza',
    emoji: '🌶️',
    tagline: 'Nessun filtro, nessuna via d\'uscita',
    color: '#EF4444',
    ageWarning: true,
  },
]

// Lookup helper usato da HomeScreen e dal copy.
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id)
