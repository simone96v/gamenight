// Registro dei giochi disponibili nell'hub.
// `component` è lazy-loaded così il bundle iniziale resta minimo.
// `locked: true` → "Prossimamente", non giocabile.
// `compatibility.multi/single` → in quali modalità mostrarlo.
// `compatibility.excludedCategories` → categorie SERATA (couple/gamenight/bar) in cui NON mostrarlo.
// `gameCategory` → categoria strutturale (quiz/arcade/cards/party).

import { lazy } from 'react'

// Categorie strutturali dei giochi: la prima fascia di scelta dopo la lobby.
// Stesso stile per tutti i box (bg/shadow/border/textColor uniformi); cambiano
// solo emoji, label e description. Border 1px integer (no sub-pixel artefatti
// sui bordi arrotondati con anti-aliasing).
// Box neutro (surface) con SOLO l'outline colorato per identificare la categoria.
// Palette analoga indigo → emerald → rose → amber con stessa saturazione così
// le card affiancate stanno in armonia. textColor lasciato a var(--text) così
// si adatta al tema.
export const GAME_CATEGORIES = [
  {
    id: 'quiz',
    label: 'Quiz',
    emoji: '🧠',
    description: 'Cultura generale, parole e intuito. Sfida i tuoi amici a colpi di domande veloci.',
    bg: 'var(--surface)',
    shadow: 'rgba(99, 102, 241, 0.16)',
    border: '2px solid #6366F1',
    textColor: 'var(--text)',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    emoji: '🕹️',
    description: 'Mini-giochi endless da fare da solo. Punta in alto e scala la classifica globale.',
    bg: 'var(--surface)',
    shadow: 'rgba(16, 185, 129, 0.16)',
    border: '2px solid #10B981',
    textColor: 'var(--text)',
  },
  {
    id: 'cards',
    label: 'Carte',
    emoji: '🃏',
    description: 'Pesca, leggi, gioca: ogni carta è una sfida da affrontare insieme al gruppo.',
    bg: 'var(--surface)',
    shadow: 'rgba(244, 63, 94, 0.16)',
    border: '2px solid #F43F5E',
    textColor: 'var(--text)',
  },
  {
    id: 'party',
    label: 'Party',
    emoji: '🎉',
    description: 'Giochi pensati per la serata in compagnia. Risate e silenzi imbarazzanti garantiti.',
    bg: 'var(--surface)',
    shadow: 'rgba(245, 158, 11, 0.16)',
    border: '2px solid #F59E0B',
    textColor: 'var(--text)',
  },
]

export const getGameCategory = (id) => GAME_CATEGORIES.find((c) => c.id === id)

// Helper per definire un placeholder di gioco non ancora implementato.
// L'id deve essere univoco. `meta` permette di dargli nome/emoji/descrizione
// reali così le 4 categorie sono pre-popolate con idee credibili — sarà
// l'utente a vederlo come "Prossimamente" tramite il flag locked + badge UI.
// Card artwork condivisa per i placeholder. Stessa estetica delle card reali
// (illustrazione flat con outline marcato, light/dark). Si può override via
// meta.image se un placeholder vuole un'illustrazione custom.
const PLACEHOLDER_IMAGE = {
  light: '/games/cards/placeholder-light.png',
  dark: '/games/cards/placeholder-dark.png',
}

const placeholder = (id, gameCategory, meta = {}) => ({
  id,
  name: meta.name || 'Prossimamente',
  emoji: meta.emoji || '✨',
  image: meta.image || PLACEHOLDER_IMAGE,
  tagline: meta.tagline || 'In arrivo',
  description: meta.description || 'Un nuovo gioco sta per arrivare. Stay tuned!',
  difficulty: meta.difficulty ?? 1,
  minPlayers: meta.minPlayers ?? 2,
  maxPlayers: meta.maxPlayers ?? 8,
  locked: true,
  bg: meta.bg || 'linear-gradient(145deg, #E5E7EB 0%, #9CA3AF 55%, #4B5563 100%)',
  shadow: meta.shadow || 'rgba(107, 114, 128, 0.30)',
  gameCategory,
  compatibility: meta.compatibility || { multi: true, single: true, excludedCategories: [] },
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
  placeholder('quiz_year', 'quiz', {
    name: 'Anno Misterioso',
    emoji: '📅',
    tagline: 'Quando è successo?',
    description: 'Un fatto storico, pop o assurdo. Indovina l\'anno: più sei vicino, più punti.',
    difficulty: 2,
  }),
  placeholder('quiz_price', 'quiz', {
    name: 'Indovina il Prezzo',
    emoji: '💰',
    tagline: 'Più ti avvicini, più punti',
    description: 'Un oggetto, un prezzo nascosto. Spara la tua cifra: chi si avvicina di più si prende il round.',
    difficulty: 2,
  }),

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
  placeholder('blobtap', 'arcade', {
    name: 'Blob Tap',
    emoji: '👆',
    tagline: 'Acchiappa i blob che spuntano',
    description: 'Whack-a-mole 30s: i blob appaiono random sulla griglia e spariscono in fretta. Tappa il più possibile prima che il timer finisca.',
    difficulty: 1,
    minPlayers: 1,
    maxPlayers: 1,
    bg: 'linear-gradient(145deg, #FBCFE8 0%, #EC4899 55%, #831843 100%)',
    shadow: 'rgba(236, 72, 153, 0.40)',
    compatibility: { multi: false, single: true, excludedCategories: [] },
  }),
  placeholder('blobstack', 'arcade', {
    name: 'Blob Stack',
    emoji: '🗼',
    tagline: 'Una torre, al millimetro',
    description: 'Impila i blob al volo. Sbaglia il tempo e la fetta si assottiglia. Una vibrazione di troppo e crolla tutto.',
    difficulty: 2,
    minPlayers: 1,
    maxPlayers: 1,
    compatibility: { multi: false, single: true, excludedCategories: [] },
  }),
  placeholder('snake', 'arcade', {
    name: 'Blob Snake',
    emoji: '🐍',
    tagline: 'Mangia, cresci, sopravvivi',
    description: 'Guida il serpente di blob: divora le pillole, cresci, non sbattere sulla coda.',
    difficulty: 2,
    minPlayers: 1,
    maxPlayers: 1,
    bg: 'linear-gradient(145deg, #A7F3D0 0%, #14B8A6 55%, #0F766E 100%)',
    shadow: 'rgba(20, 184, 166, 0.40)',
    compatibility: { multi: false, single: true, excludedCategories: [] },
  }),

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
  placeholder('dilemma', 'cards', {
    name: 'Dilemma',
    emoji: '🤔',
    tagline: 'Cosa faresti?',
    description: 'Pesca una situazione impossibile: ognuno spiega la sua scelta, il gruppo vota la più convincente.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('top5', 'cards', {
    name: 'Top 5',
    emoji: '🏆',
    tagline: 'La tua classifica al volo',
    description: 'Tema random, dai la tua top 5 in 30 secondi. Il gruppo vota la più creativa o assurda.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('wouldyourather', 'cards', {
    name: 'Cosa Preferisci?',
    emoji: '⚖️',
    tagline: 'Due opzioni, una scelta',
    description: 'Due alternative, entrambe orribili (o entrambe bellissime). Scegli, giustifica, ridi.',
    difficulty: 1,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('bluff', 'cards', {
    name: 'Bluff',
    emoji: '🎲',
    tagline: 'Verità o menzogna?',
    description: 'Pesca una carta, dichiara cosa c\'è scritto. Gli altri possono accusarti di mentire — chi sgama, vince.',
    difficulty: 3,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('tell3', 'cards', {
    name: 'Dimmi 3',
    emoji: '⚡',
    tagline: 'Sparale veloci',
    description: 'Tre cose su un tema random in 10 secondi. Se inciampi paghi pegno, se rispondi prendi punti.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),

  // ───── PARTY ─────
  placeholder('twotruths', 'party', {
    name: '2 Verità 1 Bugia',
    emoji: '🤥',
    tagline: 'Scopri chi mente',
    description: 'Racconta tre cose su di te: due vere, una falsa. Gli altri devono beccare la bugia.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('headsup', 'party', {
    name: 'Fronte Magico',
    emoji: '📲',
    tagline: 'Telefono in fronte',
    description: 'Tieni il telefono sulla fronte, gli altri danno indizi senza dire la parola. Indovina prima che scada il tempo.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('dubthis', 'party', {
    name: 'Doppiaggio Folle',
    emoji: '🎬',
    tagline: 'Dai la voce al video',
    description: 'Un video muto, microfono aperto. Inventa il doppiaggio: il gruppo vota la performance più assurda.',
    difficulty: 2,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('findobject', 'party', {
    name: 'Trovaroba',
    emoji: '🔍',
    tagline: 'Corri e torna col bottino',
    description: 'Un oggetto da trovare in casa. Il primo che torna davanti al telefono col bottino si prende il round.',
    difficulty: 1,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('voiceguess', 'party', {
    name: 'Indovina la Voce',
    emoji: '🎙️',
    tagline: 'Chi parla così?',
    description: 'Un giocatore registra una frase con voce alterata dall\'app. Gli altri devono indovinare chi è.',
    difficulty: 2,
    minPlayers: 3,
    maxPlayers: 8,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
  placeholder('howwellyouknow', 'party', {
    name: 'Quanto Mi Conosci?',
    emoji: '🧠',
    tagline: 'Domande sul gruppo',
    description: 'Domande personali su un giocatore: gli altri devono indovinare la sua risposta. Chi conosce meglio gli amici vince.',
    difficulty: 2,
    minPlayers: 3,
    maxPlayers: 8,
    compatibility: { multi: true, single: false, excludedCategories: [] },
  }),
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
