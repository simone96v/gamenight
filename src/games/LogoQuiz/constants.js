// Costanti condivise di LogoQuiz.

export const ROUND_DURATION_S = 12
export const DEFAULT_NUM_LOGOS = 5
export const NUM_LOGOS_OPTIONS = [5, 10, 15]
export const ROUND_DURATION_OPTIONS = [8, 12, 20]

export const POINTS_CORRECT = 10

// Labels umane dei cluster (mostrati nel reveal).
export const CLUSTER_LABEL = {
  tech: '💻 Tech',
  fastfood: '🍔 Fast Food',
  beverage: '🥤 Beverage',
  automotive: '🏎️ Automotive',
  fashion: '👟 Fashion',
  social_app: '📱 Social',
  sport_club: '🏆 Sport',
  media_tv: '📺 Media',
  gaming: '🎮 Gaming',
  retail: '🛒 Retail',
}

export const clusterLabel = (id) => CLUSTER_LABEL[id] ?? id
