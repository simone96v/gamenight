// Heartbeat dell'host (online only). Sostituisce useHostCleanup.
// Ogni HEARTBEAT_INTERVAL_MS scrive `state.hostLastSeen` su Supabase così
// i client possono accorgersi quando l'host scompare (tab in background,
// crash, rete morta, ecc).
//
// Comportamento al ritorno dal background:
//   - se l'host era offline per >RESET_GAP_MS, forziamo phase='lobby' e
//     puliamo lo stato di gioco (gameCategoryVotes, gameVotes, scrambleSession,
//     ecc): i client che erano fermi in "attesa host" vengono ricondotti tutti
//     in lobby e l'host può scegliere un nuovo gioco da capo.
//   - se invece eravamo brevemente offline (<=RESET_GAP_MS), pushiamo solo
//     l'heartbeat aggiornato senza toccare la phase.
//
// L'uscita esplicita dell'host avviene dal click del logo in AppHeader
// (closeRoom → phase='closed'). NON chiudiamo più la stanza su beforeunload:
// così l'host che ha chiuso accidentalmente la tab può rientrare via codice
// e i client lo aspettano in lobby.

import { useEffect, useRef } from 'react'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'

const HEARTBEAT_INTERVAL_MS = 3000
const RESET_GAP_MS = 10000

// Chiavi gameState che vengono RESETTATE quando l'host ritorna dopo un gap
// > RESET_GAP_MS. Tutto ciò che è "transient di gioco" sparisce; i campi di
// configurazione (categoria serata, partyName) restano.
const GAME_STATE_RESET_KEYS = {
  gameCategoryVotes: {},
  selectedGameCategory: null,
  gameVotes: {},
  selectedGame: null,
  // Trivia
  triviaSession: null,
  deck: null,
  currentQuestion: null,
  currentRound: null,
  roundResults: null,
  // Scramble
  scrambleSession: null,
  scrambleRacks: null,
  scrambleWords: {},
  scrambleWordCounts: {},
  scrambleScores: {},
  scrambleRoundResults: {},
  // EmojiQuiz
  eqSession: null,
  // Mappa (deck/round/results vivono dentro gameState)
}

export const useHostHeartbeat = () => {
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const lastFireRef = useRef(0)
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (mode !== 'online' || !isHost || !roomCode) {
      lastFireRef.current = 0
      return
    }

    let cancelled = false

    const fire = async ({ forceReset = false } = {}) => {
      if (inFlightRef.current) return
      const now = Date.now()
      const previousFire = lastFireRef.current
      const wasGap = previousFire > 0 && (now - previousFire > RESET_GAP_MS)
      lastFireRef.current = now

      const s = useSession.getState()
      // L'host potrebbe non essere più tale se nel frattempo è uscito.
      if (s.mode !== 'online' || !s.isHost || !s.roomCode) return
      // Se la stanza è già chiusa, nessun heartbeat — siamo in fase di teardown.
      if (s.currentPhase === 'closed') return

      const shouldReset = (wasGap || forceReset) && s.currentPhase !== 'lobby'
      const hostLastSeen = new Date(now).toISOString()

      let nextGameState = { ...(s.gameState || {}), hostLastSeen }
      let nextPhase = s.currentPhase
      let nextActiveGame = s.activeGame

      if (shouldReset) {
        nextGameState = { ...nextGameState, ...GAME_STATE_RESET_KEYS }
        nextPhase = 'lobby'
        nextActiveGame = null
        // Reset locale dello store, navigation la gestiscono i client via useRoomSync
        useSession.setState({
          currentPhase: 'lobby',
          activeGame: null,
          gameState: nextGameState,
        })
      } else {
        useSession.setState({ gameState: nextGameState })
      }

      const fullState = {
        players: s.players,
        currentIdx: shouldReset ? 0 : s.currentIdx,
        round: shouldReset ? 0 : s.round,
        activeGame: nextActiveGame,
        ...nextGameState,
      }

      inFlightRef.current = true
      try {
        await pushRoom(roomCode, nextPhase, fullState)
      } catch {
        // Network down — riproveremo al prossimo tick.
      } finally {
        inFlightRef.current = false
      }
    }

    // Prima scrittura immediata per pubblicare hostLastSeen senza attendere il tick.
    fire()

    const interval = setInterval(() => {
      if (cancelled) return
      fire()
    }, HEARTBEAT_INTERVAL_MS)

    // visibilitychange → al ritorno in foreground i timer JS potrebbero
    // essere stati throttled. Forziamo un check immediato.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      const gap = lastFireRef.current > 0 ? now - lastFireRef.current : 0
      fire({ forceReset: gap > RESET_GAP_MS })
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [mode, isHost, roomCode])
}
