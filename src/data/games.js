// Registro dei giochi disponibili nell'hub.
// `component` è lazy-loaded così il bundle iniziale resta minimo.
// `locked: true` → "Prossimamente", non giocabile.
// `compatibility.multi/single` → in quali modalità mostrarlo.
// `compatibility.excludedCategories` → categorie in cui NON mostrarlo.

import { lazy } from 'react'

export const GAMES = [
  {
    id: 'trivia',
    name: 'Trivia',
    emoji: '🧠',
    tagline: 'Chi sa di più?',
    description: 'Cultura, scienza, sport e gossip. Chi sa di più vince.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #C4B5FD 0%, #A78BFA 60%, #8B5CF6 100%)',
    shadow: 'rgba(139, 92, 246, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/Trivia')),
  },
  {
    id: 'mappa',
    name: 'Mappa',
    emoji: '🗺️',
    tagline: 'Indovina dove!',
    description: 'Un luogo appare, tu piazzi il pin. Più sei vicino, più punti fai.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #34D399 0%, #059669 60%, #047857 100%)',
    shadow: 'rgba(5, 150, 105, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/Mappa')),
  },
  {
    id: 'neverhave',
    name: 'Non ho mai',
    emoji: '🍻',
    tagline: 'Chi l\'ha fatto beve',
    description: 'Si pesca una carta "Non ho mai...". Chi l\'ha fatto beve.',
    difficulty: 1,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #FB923C 0%, #F97316 60%, #EA580C 100%)',
    shadow: 'rgba(249, 115, 22, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: ['couple', 'gamenight'] },
    component: lazy(() => import('../games/NeverHaveI')),
  },
  {
    id: 'sentenza',
    name: 'Sentenza',
    emoji: '⚖️',
    tagline: 'Il Giudice ha sempre ragione',
    description: 'Completa la frase con la carta più assurda. Il Giudice sceglie la migliore.',
    difficulty: 1,
    minPlayers: 3,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #818CF8 0%, #6366F1 60%, #4F46E5 100%)',
    shadow: 'rgba(99, 102, 241, 0.40)',
    compatibility: { multi: true, single: false, excludedCategories: ['couple'] },
    component: lazy(() => import('../games/Sentenza')),
  },
  {
    id: 'emojiquiz',
    name: 'Emoji Quiz',
    emoji: '🎬',
    tagline: 'Decifra il film o la canzone',
    description: 'Dietro gli emoji si nasconde un titolo. Il primo che lo indovina si prende i punti.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #FBCFE8 0%, #F472B6 60%, #DB2777 100%)',
    shadow: 'rgba(219, 39, 119, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/EmojiQuiz')),
  },
  {
    id: 'blobjump',
    name: 'Blob Jump',
    emoji: '🦘',
    tagline: 'Salta più in alto!',
    description: 'Il tuo blob rimbalza verso il cielo. Chi sale più in alto vince!',
    difficulty: 1,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #C4B5FD 0%, #A78BFA 60%, #7C3AED 100%)',
    shadow: 'rgba(124, 58, 237, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: ['couple'] },
    component: lazy(() => import('../games/BlobJump')),
  },
]

export const getGame = (id) => GAMES.find((g) => g.id === id)

// Filtra i giochi giocabili in una certa mode + categoria.
export const availableGamesFor = ({ mode, categoryId }) => GAMES.filter((g) => {
  if (g.locked) return false
  if (mode === 'local' && !g.compatibility?.single) return false
  if (mode === 'online' && !g.compatibility?.multi) return false
  if (categoryId && g.compatibility?.excludedCategories?.includes(categoryId)) return false
  return true
})
