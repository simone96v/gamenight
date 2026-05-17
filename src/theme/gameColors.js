import { BLOB_GRADIENTS, hexToRgb } from '../utils/colors'

// ── Per-game fallback palettes (used only when no player color is available) ──
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
  scramble: {
    accent: '#14B8A6',
    accentLight: '#5EEAD4',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #5EEAD4 100%)',
    shadow: 'rgba(20, 184, 166, 0.35)',
    shadowLight: 'rgba(20, 184, 166, 0.18)',
    badgeBorder: 'rgba(20, 184, 166, 0.18)',
    hoverGlow: '0 8px 20px rgba(20, 184, 166, 0.4)',
  },
  catchblob: {
    accent: '#D97706',
    accentLight: '#FCD34D',
    gradient: 'linear-gradient(135deg, #D97706 0%, #FCD34D 100%)',
    shadow: 'rgba(217, 119, 6, 0.35)',
    shadowLight: 'rgba(217, 119, 6, 0.18)',
    badgeBorder: 'rgba(217, 119, 6, 0.18)',
    hoverGlow: '0 8px 20px rgba(217, 119, 6, 0.4)',
  },
}

// ── Dynamic palette from any hex color (same shape as GAME_COLORS entries) ──
function playerPalette(color) {
  const c = color || '#8B5CF6'
  const grad = BLOB_GRADIENTS[c]
  const light = grad?.[0] || c
  const [r, g, b] = hexToRgb(c)
  return {
    accent: c,
    accentLight: light,
    gradient: `linear-gradient(135deg, ${c} 0%, ${light} 100%)`,
    shadow: `rgba(${r},${g},${b},0.35)`,
    shadowLight: `rgba(${r},${g},${b},0.18)`,
    badgeBorder: `rgba(${r},${g},${b},0.18)`,
    hoverGlow: `0 8px 20px rgba(${r},${g},${b},0.4)`,
  }
}

// ── Button styles ──
const RAINBOW_BTN = {
  // Sfondo fisso scuro + bordo multicolor: contrasto garantito sia in light
  // che in dark mode (var(--accent) flippava chiaro/scuro col tema rompendo il testo).
  background:
    'linear-gradient(#0F172A, #0F172A) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box',
  color: '#fff',
  border: '3px solid transparent',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
}

/**
 * Generate a button style tinted with a specific color.
 * Pass a hex color string (e.g. '#8B5CF6') for a player-colored button.
 * Pass nothing or null for the default rainbow button.
 */
const accentBtnStyle = (color) => {
  if (!color) return RAINBOW_BTN
  const grad = BLOB_GRADIENTS[color]
  const light = grad?.[0] || color
  const [r, g, b] = hexToRgb(color)
  return {
    background: `linear-gradient(135deg, ${color}, ${light})`,
    color: '#fff',
    border: 'none',
    boxShadow: `0 8px 24px rgba(${r},${g},${b},0.35)`,
  }
}

const SPRING = { type: 'spring', stiffness: 400, damping: 22 }

export { GAME_COLORS, playerPalette, accentBtnStyle, SPRING }
