// Registro dei giochi disponibili nell'hub.
// `component` è lazy-loaded così il bundle iniziale resta minimo.
// `locked: true` → "Prossimamente", non giocabile.
// `compatibility.multi/single` → in quali modalità mostrarlo.
// `compatibility.excludedCategories` → categorie SERATA (couple/gamenight/bar) in cui NON mostrarlo.
// `gameCategory` → categoria strutturale (quiz/arcade/cards/party).

import { lazy } from 'react'

// Categorie strutturali dei giochi: la prima fascia di scelta dopo la lobby.
export const GAME_CATEGORIES = [
  {
    id: 'quiz',
    label: 'Quiz',
    emoji: '🧠',
    description: 'Cultura, parole, intuito. Chi sa di più vince.',
    bg: 'linear-gradient(135deg, #C7D2FE 0%, #818CF8 60%, #4F46E5 100%)',
    shadow: 'rgba(79, 70, 229, 0.40)',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    emoji: '🕹️',
    description: 'Endless single player con classifica globale.',
    bg: 'linear-gradient(135deg, #A7F3D0 0%, #34D399 60%, #059669 100%)',
    shadow: 'rgba(5, 150, 105, 0.40)',
  },
  {
    id: 'cards',
    label: 'Carte',
    emoji: '🃏',
    description: 'Pesca, leggi e... gioca.',
    bg: 'linear-gradient(135deg, #FCA5A5 0%, #F87171 60%, #DC2626 100%)',
    shadow: 'rgba(220, 38, 38, 0.40)',
  },
  {
    id: 'party',
    label: 'Party',
    emoji: '🎉',
    description: 'Tutti insieme. Risate garantite.',
    bg: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 60%, #D97706 100%)',
    shadow: 'rgba(217, 119, 6, 0.40)',
  },
]

export const getGameCategory = (id) => GAME_CATEGORIES.find((c) => c.id === id)

// Helper per definire un placeholder "Prossimamente". L'id deve essere univoco.
const placeholder = (id, gameCategory) => ({
  id,
  name: 'Prossimamente',
  emoji: '✨',
  tagline: 'In arrivo',
  description: 'Un nuovo gioco sta per arrivare. Stay tuned!',
  difficulty: 1,
  minPlayers: 2,
  maxPlayers: 8,
  locked: true,
  bg: 'linear-gradient(145deg, #E5E7EB 0%, #9CA3AF 55%, #4B5563 100%)',
  shadow: 'rgba(107, 114, 128, 0.30)',
  gameCategory,
  compatibility: { multi: true, single: true, excludedCategories: [] },
  component: null,
})

export const GAMES = [
  // ───── QUIZ ─────
  {
    id: 'trivia',
    gameCategory: 'quiz',
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
    id: 'emojiquiz',
    gameCategory: 'quiz',
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
    id: 'mappa',
    gameCategory: 'quiz',
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
    id: 'scramble',
    gameCategory: 'quiz',
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

  // ───── ARCADE (endless, solo single player) ─────
  {
    id: 'blobjump',
    gameCategory: 'arcade',
    name: 'Blob Jump',
    emoji: '🦘',
    image: { light: '/games/cards/blobjump-light.png', dark: '/games/cards/blobjump-dark.png' },
    tagline: 'Salta più in alto!',
    description: 'Il tuo blob rimbalza verso il cielo. Quanto sali?',
    difficulty: 1,
    minPlayers: 1,
    maxPlayers: 1,
    locked: false,
    bg: 'linear-gradient(145deg, #A7F3D0 0%, #10B981 55%, #064E3B 100%)',
    shadow: 'rgba(16, 185, 129, 0.40)',
    compatibility: { multi: false, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/BlobJump')),
  },
  {
    id: 'flappyblob',
    gameCategory: 'arcade',
    name: 'Flappy Blob',
    emoji: '🐤',
    image: { light: '/games/cards/flappyblob-light.png', dark: '/games/cards/flappyblob-dark.png' },
    tagline: 'Tap, vola, non sbatterci',
    description: 'Tap per far volare il blob fra i tubi. Un colpo e sei fuori.',
    difficulty: 2,
    minPlayers: 1,
    maxPlayers: 1,
    locked: false,
    bg: 'linear-gradient(145deg, #FDE68A 0%, #F59E0B 55%, #78350F 100%)',
    shadow: 'rgba(245, 158, 11, 0.40)',
    compatibility: { multi: false, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/FlappyBlob')),
  },
  {
    id: 'catchblob',
    gameCategory: 'arcade',
    name: 'Catch The Blob',
    emoji: '🧺',
    image: { light: '/games/cards/catchblob-light.png', dark: '/games/cards/catchblob-dark.png' },
    tagline: 'Acchiappa i tuoi blob!',
    description: 'I blob cadono dal cielo. Prendi i tuoi col cesto, evita gli altri e le bombe.',
    difficulty: 2,
    minPlayers: 1,
    maxPlayers: 1,
    locked: false,
    bg: 'linear-gradient(145deg, #FCD34D 0%, #D97706 55%, #78350F 100%)',
    shadow: 'rgba(217, 119, 6, 0.40)',
    compatibility: { multi: false, single: true, excludedCategories: [] },
    component: lazy(() => import('../games/CatchBlob')),
  },
  placeholder('arcade_soon_1', 'arcade'),

  // ───── CARDS ─────
  {
    id: 'neverhave',
    gameCategory: 'cards',
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
  placeholder('cards_soon_1', 'cards'),
  placeholder('cards_soon_2', 'cards'),
  placeholder('cards_soon_3', 'cards'),

  // ───── PARTY ─────
  placeholder('party_soon_1', 'party'),
  placeholder('party_soon_2', 'party'),
  placeholder('party_soon_3', 'party'),
  placeholder('party_soon_4', 'party'),
]

export const getGame = (id) => GAMES.find((g) => g.id === id)

// Filtra i giochi giocabili in una certa mode + categoria serata + categoria strutturale.
// `categoryId` = couple/gamenight/bar (categoria SERATA usata per excludedCategories)
// `gameCategory` = quiz/arcade/cards/party (categoria STRUTTURALE)
export const availableGamesFor = ({ mode, categoryId, gameCategory } = {}) => GAMES.filter((g) => {
  if (g.locked) {
    // Placeholder: rispetta il filtro per categoria strutturale ma non per mode.
    if (gameCategory && g.gameCategory !== gameCategory) return false
    return true
  }
  if (mode === 'local' && !g.compatibility?.single) return false
  if (mode === 'online' && !g.compatibility?.multi) return false
  if (categoryId && g.compatibility?.excludedCategories?.includes(categoryId)) return false
  if (gameCategory && g.gameCategory !== gameCategory) return false
  return true
})

// Conta i giochi giocabili (non placeholder) di una categoria nella mode richiesta.
export const playableCountFor = ({ mode, gameCategory }) =>
  GAMES.filter((g) => {
    if (g.locked) return false
    if (g.gameCategory !== gameCategory) return false
    if (mode === 'local' && !g.compatibility?.single) return false
    if (mode === 'online' && !g.compatibility?.multi) return false
    return true
  }).length
