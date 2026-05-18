// Hook di sincronizzazione Realtime con la stanza Supabase.
// MONTATO UNA SOLA VOLTA in App.jsx — NON ripetere in altre schermate.
//
// Responsabilità:
//   1. al mount, se mode==='online' fa lo snapshot iniziale (getRoom) e si iscrive (subscribeToRoom)
//   2. su ogni update, sincronizza lo store e — se non è host — naviga alla phase corrente
//   3. gestisce reconnect con backoff fino a MAX_RECONNECT_ATTEMPTS
//   4. se la phase diventa 'closed' (host ha chiuso esplicitamente), setta hostClosed
//      → PartyClosedModal blocca la UI con CTA "Torna alla home"
//   5. se hostLastSeen è stale (>HOST_OFFLINE_THRESHOLD_MS) e siamo client, setta hostOffline
//      → HostOfflineModal mostra "Host disconnesso, attendiamo..."
//   6. tiene aggiornato connectionAttempts per la OwnConnectionModal lato client.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoom, subscribeToRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 3000
const HOST_OFFLINE_THRESHOLD_MS = 10000
const HOST_OFFLINE_POLL_MS = 2000

const phaseToPath = (phase) => {
  switch (phase) {
    case 'lobby':       return '/lobby'
    case 'category_voting': return '/game-category'
    case 'game_voting': return '/games'
    case 'trivia_lobby': return '/trivia-lobby'
    case 'trivia_wheel': return '/game/trivia'
    case 'countdown':   return '/game/trivia'
    case 'question':    return '/game/trivia'
    case 'reveal':      return '/game/trivia'
    case 'final':       return '/game/trivia'
    case 'mappa_lobby':        return '/mappa-lobby'
    case 'mappa_countdown':   return '/game/mappa'
    case 'mappa_question':    return '/game/mappa'
    case 'mappa_reveal':      return '/game/mappa'
    case 'mappa_final':       return '/game/mappa'
    // Endless games (blobjump/catchblob/flappyblob) sono single-player only,
    // niente sync remoto. Le loro phase non sono mai pushate su `rooms`.
    case 'emojiquiz_lobby':       return '/emojiquiz-lobby'
    case 'emojiquiz_countdown':   return '/game/emojiquiz'
    case 'emojiquiz_playing':     return '/game/emojiquiz'
    case 'emojiquiz_results':     return '/game/emojiquiz'
    case 'emojiquiz_final':       return '/game/emojiquiz'
    case 'scramble_lobby':        return '/scramble-lobby'
    case 'scramble_countdown':    return '/game/scramble'
    case 'scramble_playing':      return '/game/scramble'
    case 'scramble_results':      return '/game/scramble'
    case 'scramble_final':        return '/game/scramble'
    case 'play_neverhave':    return '/game/neverhave'
    case 'hub':        return '/hub'
    case 'game':       return '/game/trivia'
    case 'round_end':  return '/round-end'
    case 'scoreboard': return '/scoreboard'
    default:           return null
  }
}

export const useRoomSync = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')

  const mode          = useSession((s) => s.mode)
  const roomCode      = useSession((s) => s.roomCode)
  const isHost        = useSession((s) => s.isHost)
  const awaitingGameChange = useSession((s) => s.awaitingGameChange)
  const syncFromRemote = useSession((s) => s.syncFromRemote)
  const showError     = useSession((s) => s.showError)
  const setHostOffline = useSession((s) => s.setHostOffline)
  const setHostClosed = useSession((s) => s.setHostClosed)
  const setConnectionAttempts = useSession((s) => s.setConnectionAttempts)

  const subRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const attemptsRef = useRef(0)
  const isHostRef = useRef(isHost)
  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])

  const awaitingRef = useRef(awaitingGameChange)
  useEffect(() => {
    awaitingRef.current = awaitingGameChange
  }, [awaitingGameChange])

  useEffect(() => {
    if (mode !== 'online' || !roomCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle')
      setHostOffline(false)
      setHostClosed(false)
      setConnectionAttempts(0)
      return
    }

    let cancelled = false

    const navigateToPhase = (phase) => {
      if (awaitingRef.current) return
      const target = phaseToPath(phase)
      if (target && window.location.pathname !== target) navigate(target)
    }

    const handler = ({ phase, state, questionStartedAt, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('disconnected')
        scheduleReconnect()
        return
      }

      // Host ha chiuso esplicitamente il party.
      if (phase === 'closed') {
        if (!isHostRef.current) {
          setHostClosed(true)
        }
        return
      }

      // Nuovo update → resettiamo flag di host-offline se l'host ha appena
      // ripreso a battere (il check periodico lo confermerà).
      syncFromRemote(state, phase, questionStartedAt)
      navigateToPhase(phase)
    }

    const scheduleReconnect = () => {
      if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        // Non kicchiamo più a casa automaticamente: la OwnConnectionModal
        // mostra "Connessione persa" con CTA esplicito "Torna alla home".
        setStatus('disconnected')
        return
      }
      attemptsRef.current += 1
      setConnectionAttempts(attemptsRef.current)
      // Banner inline per i primi 2 tentativi; modale prende il sopravvento dopo.
      if (attemptsRef.current <= 2) showError('connection')
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) connect()
      }, RECONNECT_DELAY_MS)
    }

    const connect = async () => {
      setStatus('connecting')
      const { room, error } = await getRoom(roomCode)
      if (cancelled) return
      if (error || !room) {
        // Stanza inesistente → errore terminale, banner classico.
        if (!isHostRef.current) {
          showError('room_not_found')
        }
        setStatus('disconnected')
        return
      }

      // Stanza chiusa esplicitamente dall'host.
      if (room.phase === 'closed') {
        if (!isHostRef.current) {
          setHostClosed(true)
        }
        return
      }

      syncFromRemote(room.state, room.phase, room.question_started_at)
      navigateToPhase(room.phase)

      subRef.current?.unsubscribe()
      subRef.current = subscribeToRoom(roomCode, handler)
      attemptsRef.current = 0
      setConnectionAttempts(0)
      setStatus('connected')
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimerRef.current)
      subRef.current?.unsubscribe()
      subRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roomCode])

  // ── Detection host-offline via heartbeat staleness ──
  // Polling perché Realtime non rinvia eventi se il valore non cambia.
  useEffect(() => {
    if (mode !== 'online' || isHost || !roomCode) {
      setHostOffline(false)
      return
    }
    const check = () => {
      const s = useSession.getState()
      if (s.hostClosed) {
        setHostOffline(false)
        return
      }
      const ts = s.gameState?.hostLastSeen
      if (!ts) {
        // Stanze pre-heartbeat (legacy) o appena create: non triggeriamo.
        return
      }
      const age = Date.now() - new Date(ts).getTime()
      const offline = age > HOST_OFFLINE_THRESHOLD_MS
      if (offline !== s.hostOffline) setHostOffline(offline)
    }
    check()
    const interval = setInterval(check, HOST_OFFLINE_POLL_MS)
    return () => clearInterval(interval)
  }, [mode, isHost, roomCode, setHostOffline])

  return { status }
}
