// Registro dei giochi disponibili nell'hub.
// `component` è lazy-loaded così il bundle iniziale resta minimo.
// `locked: true` indica giochi in arrivo (non ancora giocabili).

import { lazy } from 'react'

export const GAMES = [
  {
    id: 'trivia',
    name: 'Trivia',
    emoji: '🧠',
    description: 'Domande a risposta multipla. Vince chi sa di più.',
    difficulty: 'medium',
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    component: lazy(() => import('../games/Trivia')),
  },
  {
    id: 'draw',
    name: 'Disegna!',
    emoji: '🎨',
    description: 'Disegna e fai indovinare agli altri.',
    difficulty: 'easy',
    minPlayers: 3,
    maxPlayers: 8,
    locked: true,
  },
  {
    id: 'stop',
    name: 'Stop!',
    emoji: '✏️',
    description: 'Categorie e lettere contro il tempo.',
    difficulty: 'easy',
    minPlayers: 2,
    maxPlayers: 10,
    locked: true,
  },
  {
    id: 'bluff',
    name: 'Bluff',
    emoji: '🃏',
    description: 'Inganna i tuoi amici con definizioni false.',
    difficulty: 'hard',
    minPlayers: 3,
    maxPlayers: 8,
    locked: true,
  },
  {
    id: 'mimo',
    name: 'Mimo',
    emoji: '🎭',
    description: 'Fai indovinare parole solo con gesti.',
    difficulty: 'easy',
    minPlayers: 4,
    maxPlayers: 12,
    locked: true,
  },
  {
    id: 'bomb',
    name: 'Bomba!',
    emoji: '💣',
    description: 'Passa la bomba — chi la tiene esplode.',
    difficulty: 'easy',
    minPlayers: 2,
    maxPlayers: 10,
    locked: true,
  },
]

// Lookup helper usato da GameScreen per risolvere il componente da un id.
export const getGame = (id) => GAMES.find((g) => g.id === id)
