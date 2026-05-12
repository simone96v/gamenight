// Stato globale della sessione di gioco corrente.
// Zustand + persist su localStorage chiave 'gn:session' — sopravvive al reload.
//
// REGOLA D'ORO: ogni azione che modifica un campo di partita
// (players, currentIdx, round, activeGame, currentPhase, gameState)
// deve chiamare pushIfHost(get) alla fine. In modalità local è no-op.
// I client (online + !isHost) non chiamano mai pushRoom — eccezione: pushVote (in lib/room).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { pushRoom } from '../lib/room'
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

  error: null,
}

// Oggetto state JSONB che viene scritto sulla riga `rooms`.
const buildState = (s) => ({
  players: s.players,
  currentIdx: s.currentIdx,
  round: s.round,
  activeGame: s.activeGame,
  settings: useSettings.getState(),
  gameState: s.gameState,
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

      startGame: (gameId) => {
        set({ activeGame: gameId, gameState: {}, currentPhase: 'game' })
        pushIfHostNow(get)
      },

      endGame: (_result) => {
        // _result è informativo: i punti vengono già scritti via addScore durante il gioco.
        set({ currentPhase: 'round_end' })
        pushIfHostNow(get)
      },

      // ---- online ----
      setOnlineMode: (code, isHost, localPlayerId) => {
        // NB: non triggera push. Se è host appena fatto createRoom, l'INSERT iniziale
        // contiene già lo state. Da qui in poi ogni azione pusherà se necessario.
        set({ mode: 'online', roomCode: code, isHost: !!isHost, localPlayerId })
      },

      syncFromRemote: (remote, phase) => {
        if (!remote) return
        set((s) => {
          // Per gameState, l'host fa MERGE e il client fa REPLACE.
          // Motivo: il Realtime rimanda l'eco delle push dell'host. Se l'host
          // ha appena pushato gameState:{} (startGame) e nel frattempo il gioco
          // ha generato il deck localmente, l'eco sovrascrive il deck ⇒ spinner infinito.
          // Con il merge, l'eco di {} è un no-op perché non ha campi da sovrascrivere.
          // Per il client serve il replace perché deve sempre ricevere lo stato completo dall'host.
          let nextGameState = s.gameState
          if (remote.gameState != null) {
            nextGameState = s.isHost
              ? { ...s.gameState, ...remote.gameState }
              : remote.gameState
          }

          return {
            players:      remote.players    ?? s.players,
            currentIdx:   remote.currentIdx ?? s.currentIdx,
            round:        remote.round      ?? s.round,
            activeGame:   remote.activeGame ?? s.activeGame,
            gameState:    nextGameState,
            // Sync currentPhase solo per i client — l'host è la fonte di verità.
            ...(phase != null && !s.isHost ? { currentPhase: phase } : {}),
          }
        })
      },

      resetToLocal: () => {
        set({ mode: 'local', roomCode: null, isHost: false, localPlayerId: null })
      },

      // ---- errori ----
      showError: (type) => set({ error: type }),
      clearError: () => set({ error: null }),

      // ---- reset completo ----
      resetSession: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'gn:session',
      // sessionStorage: ogni tab ha la propria sessione.
      // Evita che host e client sullo stesso browser si sovrascrivano a vicenda.
      // Sopravvive al reload ma NON alla chiusura tab (corretto per una sessione di gioco).
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
