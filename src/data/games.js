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
    image: { light: '/games/cards/trivia-light.png', dark: '/games/cards/trivia-dark.png' },
    tagline: 'Chi sa di più?',
    description: 'Cultura, scienza, sport e gossip. Chi sa di più vince.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #FDE68A 0%, #F59E0B 55%, #B45309 100%)',
    shadow: 'rgba(245, 158, 11, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/Trivia')),
  },
  {
    id: 'mappa',
    name: 'Mappa',
    emoji: '🗺️',
    image: { light: '/games/cards/mappa-light.png', dark: '/games/cards/mappa-dark.png' },
    tagline: 'Indovina dove!',
    description: 'Un luogo appare, tu piazzi il pin. Più sei vicino, più punti fai.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #BAE6FD 0%, #38BDF8 55%, #0369A1 100%)',
    shadow: 'rgba(56, 189, 248, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/Mappa')),
  },
  {
    id: 'neverhave',
    name: 'Non ho mai',
    emoji: '🍻',
    image: { light: '/games/cards/neverhave-light.png', dark: '/games/cards/neverhave-dark.png' },
    tagline: 'Chi l\'ha fatto beve',
    description: 'Si pesca una carta "Non ho mai...". Chi l\'ha fatto beve.',
    difficulty: 1,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #FCA5A5 0%, #EF4444 55%, #991B1B 100%)',
    shadow: 'rgba(239, 68, 68, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: ['couple', 'gamenight'] },
    component: lazy(() => import('../games/NeverHaveI')),
  },
  {
    id: 'sentenza',
    name: 'Sentenza',
    emoji: '⚖️',
    image: { light: '/games/cards/sentenza-light.png', dark: '/games/cards/sentenza-dark.png' },
    tagline: 'Il Giudice ha sempre ragione',
    description: 'Completa la frase con la carta più assurda. Il Giudice sceglie la migliore.',
    difficulty: 1,
    minPlayers: 3,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #1E293B 0%, #334155 55%, #0F172A 100%)',
    shadow: 'rgba(30, 41, 59, 0.45)',
    compatibility: { multi: true, single: false, excludedCategories: ['couple'] },
    component: lazy(() => import('../games/Sentenza')),
  },
  {
    id: 'emojiquiz',
    name: 'Movie Quiz',
    emoji: '🎬',
    image: { light: '/games/cards/emojiquiz-light.png', dark: '/games/cards/emojiquiz-dark.png' },
    tagline: 'Decifra il film o la serie TV',
    description: 'Dietro gli emoji si nasconde un film o una serie TV. Il primo che lo indovina si prende i punti.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #F0ABFC 0%, #C026D3 55%, #701A75 100%)',
    shadow: 'rgba(192, 38, 211, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/EmojiQuiz')),
  },
  {
    id: 'blobjump',
    name: 'Blob Jump',
    emoji: '🦘',
    image: { light: '/games/cards/blobjump-light.png', dark: '/games/cards/blobjump-dark.png' },
    tagline: 'Salta più in alto!',
    description: 'Il tuo blob rimbalza verso il cielo. Chi sale più in alto vince!',
    difficulty: 1,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #A7F3D0 0%, #10B981 55%, #064E3B 100%)',
    shadow: 'rgba(16, 185, 129, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: ['couple'] },
    component: lazy(() => import('../games/BlobJump')),
  },
  {
    id: 'scramble',
    name: 'Scramble',
    emoji: '🔤',
    image: { light: '/games/cards/scramble-light.png', dark: '/games/cards/scramble-dark.png' },
    tagline: 'Componi più parole di tutti',
    description: 'Sette lettere, sessanta secondi. Tocca in ordine, componi parole, fai punti.',
    difficulty: 2,
    minPlayers: 2,
    maxPlayers: 8,
    locked: false,
    bg: 'linear-gradient(145deg, #C4B5FD 0%, #7C3AED 55%, #4C1D95 100%)',
    shadow: 'rgba(124, 58, 237, 0.40)',
    compatibility: { multi: true, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/Scramble')),
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
