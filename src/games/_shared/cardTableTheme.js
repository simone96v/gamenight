// Theme condiviso per i tavoli dei giochi di carte.
// Bordeaux profondo come sfondo "tavolo da casino", con CSS custom properties
// che ridefiniscono var(--text), var(--muted), var(--surface), var(--border)
// SOLO all'interno del container del gioco.
//
// I sotto-componenti che usano var(--surface)/var(--text)/var(--muted)
// (chip, badge, cell, footer) ereditano automaticamente la palette del tavolo
// senza dover modificare gli stili interni — è il "casino mode" del design system.

export const cardTableTheme = {
  background: 'linear-gradient(180deg, #5C0E1B 0%, #3F0712 100%)',
  // override CSS vars solo dentro al container del gioco
  '--text': '#F3F4F6',
  '--muted': 'rgba(255,255,255,0.72)',
  '--surface': 'rgba(255,255,255,0.08)',
  '--surface2': 'rgba(0,0,0,0.22)',
  '--border': 'rgba(255,255,255,0.14)',
  '--border-strong': 'rgba(255,255,255,0.24)',
}
