// Registro dei giochi disponibili nell'hub.
// `component` è lazy-loaded così il bundle iniziale resta minimo.
// Per aggiungere un nuovo gioco: creare la cartella in src/games/ e aggiungere una entry qui.

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
    component: lazy(() => import('../games/Trivia')),
  },
  // aggiungere altri giochi qui in futuro
]

// Lookup helper usato da GameScreen per risolvere il componente da un id.
export const getGame = (id) => GAMES.find((g) => g.id === id)
