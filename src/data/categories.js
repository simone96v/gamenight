// Categorie di serata mostrate nella CategoryScreen.
// `triviaCategoryFor` mappa l'id categoria UI → categoria di trivia.json.

export const CATEGORIES = [
  {
    id: 'couple',
    label: 'Coppia',
    emoji: '💕',
    description: 'Solo io e te. Pronti a conoscerci sul serio?',
    bg: 'linear-gradient(135deg, #FDA4AF 0%, #FB7185 60%, #F43F5E 100%)',
    shadow: 'rgba(244, 63, 94, 0.40)',
    ageWarning: true,
  },
  {
    id: 'gamenight',
    label: 'Serata tra amici',
    emoji: '🎮',
    description: 'Domande casual, sfide leggere. Classica.',
    bg: 'linear-gradient(135deg, #C4B5FD 0%, #A78BFA 60%, #8B5CF6 100%)',
    shadow: 'rgba(139, 92, 246, 0.40)',
  },
  {
    id: 'bar',
    label: 'Giochi alcolici',
    emoji: '🍺',
    description: 'Drink in mano. Freni inibitori giù.',
    bg: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #D97706 100%)',
    shadow: 'rgba(245, 158, 11, 0.40)',
    ageWarning: true,
  },
]

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id)

// Mappa l'id UI → categoria nel pool trivia.json. Per ora 1:1.
export const triviaCategoryFor = (id) => id
