// Stato globale della sessione di gioco corrente.
// Zustand + persist su localStorage chiave 'gn:session' — sopravvive al reload.
//
// REGOLA D'ORO: ogni azione che modifica un campo di partita
// (players, currentIdx, round, activeGame, currentPhase, gameState)
// deve chiamare pushIfHost(get) alla fine. In modalità local è no-op.
// I client (online + !isHost) non chiamano mai pushRoom — eccezione: pushVote (in lib/room).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { pushRoom, rpcCastVote } from '../lib/room'
import { useSettings } from './useSettings'
import { pickColor } from '../utils/colors'

const DEFAULTS = {
  mode: 'local',
  roomCode: null,
  isHost: false,
  localPlayerId: null,

  players: [],
  currentIdx: 0,
  round: 0,
  activeGame: null,
  currentPhase: 'lobby',
  gameState: {},
  questionStartedAt: null,

  // True quando l'host ha cliccato "Cambia gioco" a fine partita e sta scegliendo
  // un nuovo gioco dalla home. Sospende l'auto-navigation di useRoomSync così l'host
  // non viene riportato a /game/trivia. Si resetta quando avvia il nuovo gioco.
  awaitingGameChange: false,

  // Flag connessione/host (online only):
  //   hostOffline   → l'host non scrive heartbeat da >HOST_OFFLINE_THRESHOLD_MS.
  //                   Client: modale "Host disconnesso, attendendo...". Si chiude
  //                   automaticamente quando hostOffline torna false.
  //   hostClosed    → l'host ha chiuso esplicitamente (phase==='closed').
  //                   Modale terminale "Party chiuso → Torna alla home".
  //   connectionAttempts → contatore retry del PROPRIO client (non host).
  //                   Modale "Connessione persa" dopo OWN_CONNECTION_MODAL_AFTER.
  hostOffline: false,
  hostClosed: false,
  connectionAttempts: 0,

  error: null,
}

// Oggetto state JSONB che viene scritto sulla riga `rooms`.
// I campi sono TOP-LEVEL nel JSONB (allineato con quello che scrivono le RPC
// server-side: deck, current_question, current_round, round_results, ecc).
// `s.gameState` locale = blob piatto con TUTTI i campi di gioco mescolati
// (server-derived + client-derived come categoryVotes/selectedCategory).
const buildState = (s) => ({
  players: s.players,
  currentIdx: s.currentIdx,
  round: s.round,
  activeGame: s.activeGame,
  settings: useSettings.getState(),
  ...s.gameState,
})

// Debounced push: raggruppa chiamate rapide (es. addScore x N) in un unico push.
// Il delay di 60ms è impercettibile ma evita push multipli fuori ordine.
let _pushTimer = null
const pushIfHost = (get) => {
  const s = get()
  if (s.mode !== 'online' || !s.isHost || !s.roomCode) return
  clearTimeout(_pushTimer)
  _pushTimer = setTimeout(() => {
    const latest = get()
    if (latest.mode === 'online' && latest.isHost && latest.roomCode) {
      pushRoom(latest.roomCode, latest.currentPhase, buildState(latest))
    }
  }, 60)
}

// Push immediato — per azioni che i client devono vedere subito
// (startGame, endGame, setPhase). Cancella il debounce pendente.
const pushIfHostNow = (get) => {
  const s = get()
  if (s.mode !== 'online' || !s.isHost || !s.roomCode) return
  clearTimeout(_pushTimer)
  pushRoom(s.roomCode, s.currentPhase, buildState(s))
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const useSession = create(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      // ---- giocatori (modalità locale, e host che si auto-aggiunge in online) ----
      addPlayer: (name) => {
        const s = get()
        if (s.players.length >= 8) return null
        const player = {
          id: newId(),
          name: String(name ?? '').trim() || `Player ${s.players.length + 1}`,
          color: pickColor(s.players.length),
          score: 0,
          skip: false,
        }
        set({ players: [...s.players, player] })
        pushIfHost(get)
        return player
      },

      removePlayer: (id) => {
        const s = get()
        const idx = s.players.findIndex((p) => p.id === id)
        if (idx === -1) return
        const players = s.players.filter((p) => p.id !== id)
        // Clampa currentIdx se necessario.
        const currentIdx = players.length === 0
          ? 0
          : (idx < s.currentIdx ? s.currentIdx - 1 : Math.min(s.currentIdx, players.length - 1))
        set({ players, currentIdx })
        pushIfHost(get)
      },

      // ---- turno ----
      nextTurn: () => {
        const s = get()
        const n = s.players.length
        if (n === 0) return
        let next = (s.currentIdx + 1) % n
        let safety = 0
        while (s.players[next]?.skip && safety < n) {
          next = (next + 1) % n
          safety++
        }
        const round = next <= s.currentIdx ? s.round + 1 : s.round
        set({ currentIdx: next, round })
        pushIfHost(get)
      },

      setSkip: (id) => {
        const players = get().players.map((p) =>
          p.id === id ? { ...p, skip: !p.skip } : p,
        )
        set({ players })
        pushIfHost(get)
      },

      // ---- punteggio ----
      addScore: (id, points) => {
        const players = get().players.map((p) =>
          p.id === id ? { ...p, score: p.score + points } : p,
        )
        set({ players })
        pushIfHost(get)
      },

      addPenalty: (id, points) => {
        const players = get().players.map((p) =>
          p.id === id ? { ...p, score: p.score - points } : p,
        )
        set({ players })
        pushIfHost(get)
      },

      // ---- gioco ----
      setGameState: (partial) => {
        const merged = { ...get().gameState, ...partial }
        set({ gameState: merged })
        pushIfHost(get)
      },

      setPhase: (phase) => {
        set({ currentPhase: phase })
        pushIfHostNow(get)
      },

      setPhaseWithTimer: (phase) => {
        const now = new Date().toISOString()
        set({ currentPhase: phase, questionStartedAt: now })
        const s = get()
        if (s.mode !== 'online' || !s.isHost || !s.roomCode) return
        clearTimeout(_pushTimer)
        pushRoom(s.roomCode, phase, buildState(s), now)
      },

      startGame: (gameId) => {
        set({ activeGame: gameId, gameState: {}, currentPhase: 'game' })
        pushIfHostNow(get)
      },

      endGame: () => {
        // I punti vengono già scritti via addScore durante il gioco.
        set({ currentPhase: 'round_end' })
        pushIfHostNow(get)
      },

      // ---- online ----
      setOnlineMode: (code, isHost, localPlayerId) => {
        // NB: non triggera push. Se è host appena fatto createRoom, l'INSERT iniziale
        // contiene già lo state. Da qui in poi ogni azione pusherà se necessario.
        set({ mode: 'online', roomCode: code, isHost: !!isHost, localPlayerId })
      },

      syncFromRemote: (remote, phase, questionStartedAt) => {
        if (!remote) return
        set((s) => {
          // Tutti i campi del remote (tranne quelli con slot dedicato nello store)
          // finiscono in s.gameState come blob piatto.
          // settings non viene sincronizzato lato locale (es. category)
          // eslint-disable-next-line no-unused-vars
          const { players: rPlayers, currentIdx: rIdx, round: rRound, activeGame: rGame, settings, ...rest } = remote
          const merged = s.isHost
            ? { ...s.gameState, ...rest }
            : rest
          return {
            players:    rPlayers ?? s.players,
            currentIdx: rIdx     ?? s.currentIdx,
            round:      rRound   ?? s.round,
            activeGame: rGame    ?? s.activeGame,
            gameState:  merged,
            ...(phase != null ? { currentPhase: phase } : {}),
            ...(questionStartedAt !== undefined ? { questionStartedAt } : {}),
          }
        })
      },

      resetToLocal: () => {
        set({ mode: 'local', roomCode: null, isHost: false, localPlayerId: null })
      },

      // ---- cambio gioco ----
      setAwaitingGameChange: (v) => set({ awaitingGameChange: !!v }),

      // ---- voting (multi) ----
      // Invia il voto del local player per un campo (categoryVotes | gameVotes).
      // Usa RPC atomico server-side per evitare race-condition fra voti simultanei.
      castVote: async (field, value) => {
        const s = get()
        if (s.mode !== 'online' || !s.roomCode || !s.localPlayerId) return
        // Aggiorna localmente per UI istantanea (verrà confermato via Realtime).
        const current = s.gameState?.[field] || {}
        const updated = { ...current, [s.localPlayerId]: value }
        const newGameState = { ...s.gameState, [field]: updated }
        set({ gameState: newGameState })
        // RPC atomico: mergia il voto nel JSONB senza sovrascrivere gli altri.
        await rpcCastVote(s.roomCode, field, s.localPlayerId, value)
      },

      // L'host chiude la votazione, calcola il winner e avanza fase.
      closeVoting: async (field, nextPhase, selectedField) => {
        const s = get()
        if (s.mode !== 'online' || !s.isHost || !s.roomCode) return
        const votes = s.gameState?.[field] || {}
        const counts = {}
        Object.values(votes).forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
        const values = Object.keys(counts)
        if (values.length === 0) return
        const max = Math.max(...Object.values(counts))
        const winners = values.filter((k) => counts[k] === max)
        const winner = winners[Math.floor(Math.random() * winners.length)]
        const newGameState = { ...s.gameState, [selectedField]: winner }
        set({ gameState: newGameState, currentPhase: nextPhase })
        const fullState = buildState({ ...s, gameState: newGameState })
        await pushRoom(s.roomCode, nextPhase, fullState)
      },

      // Reset dei voti (per ricominciare la selezione).
      resetSelectionVotes: async () => {
        const s = get()
        if (!s.isHost || !s.roomCode) return
        const newGameState = {
          ...s.gameState,
          categoryVotes: {},
          gameVotes: {},
          selectedCategory: null,
          selectedGame: null,
        }
        set({ gameState: newGameState })
        if (s.mode === 'online') {
          const fullState = buildState({ ...s, gameState: newGameState })
          await pushRoom(s.roomCode, s.currentPhase, fullState)
        }
      },

      // ---- errori ----
      showError: (type) => set({ error: type }),
      clearError: () => set({ error: null }),

      // ---- connessione (vedi useRoomSync / useHostHeartbeat) ----
      setHostOffline: (v) => set({ hostOffline: !!v }),
      setHostClosed: (v) => set({ hostClosed: !!v }),
      setConnectionAttempts: (n) => set({ connectionAttempts: n }),

      // ---- reset completo ----
      resetSession: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'gn:session',
      // sessionStorage: ogni tab ha la propria sessione.
      // Evita che host e client sullo stesso browser si sovrascrivano a vicenda.
      // Sopravvive al reload ma NON alla chiusura tab (corretto per una sessione di gioco).
      storage: createJSONStorage(() => sessionStorage),
      // Bump quando lo shape del state cambia: invalida i dati persistiti incompatibili
      // (es. il restructure Trivia v2 con nuovi campi sui players).
      version: 2,
    },
  ),
)
