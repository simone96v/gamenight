const GAME_COLORS = {
  mappa: {
    accent: '#059669',
    accentLight: '#34D399',
    gradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    shadow: 'rgba(5, 150, 105, 0.35)',
    shadowLight: 'rgba(5, 150, 105, 0.18)',
    badgeBorder: 'rgba(5, 150, 105, 0.18)',
    hoverGlow: '0 8px 20px rgba(5, 150, 105, 0.4)',
  },
  trivia: {
    accent: '#7C3AED',
    accentLight: '#A78BFA',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    shadow: 'rgba(124, 58, 237, 0.35)',
    shadowLight: 'rgba(124, 58, 237, 0.18)',
    badgeBorder: 'rgba(124, 58, 237, 0.18)',
    hoverGlow: '0 8px 20px rgba(124, 58, 237, 0.4)',
  },
  sentenza: {
    accent: '#6366F1',
    accentLight: '#818CF8',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
    shadow: 'rgba(99, 102, 241, 0.35)',
    shadowLight: 'rgba(99, 102, 241, 0.18)',
    badgeBorder: 'rgba(99, 102, 241, 0.18)',
    hoverGlow: '0 8px 20px rgba(99, 102, 241, 0.4)',
  },
  neverHaveI: {
    accent: '#F97316',
    accentLight: '#FB923C',
    gradient: 'linear-gradient(145deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
    shadow: 'rgba(249, 115, 22, 0.35)',
    shadowLight: 'rgba(249, 115, 22, 0.18)',
    badgeBorder: 'rgba(249, 115, 22, 0.18)',
    hoverGlow: '0 8px 20px rgba(249, 115, 22, 0.4)',
  },
  blobjump: {
    accent: '#7C3AED',
    accentLight: '#C4B5FD',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    shadow: 'rgba(124, 58, 237, 0.35)',
    shadowLight: 'rgba(124, 58, 237, 0.18)',
    badgeBorder: 'rgba(124, 58, 237, 0.18)',
    hoverGlow: '0 8px 20px rgba(124, 58, 237, 0.4)',
  },
}

const RAINBOW_BTN = {
  background:
    'linear-gradient(var(--accent), var(--accent)) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box',
  color: 'var(--bg)',
  border: '3px solid transparent',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
}

const accentBtnStyle = () => RAINBOW_BTN

const SPRING = { type: 'spring', stiffness: 400, damping: 22 }

export { GAME_COLORS, accentBtnStyle, SPRING }
