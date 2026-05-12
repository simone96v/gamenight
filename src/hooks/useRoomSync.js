// Hook di sincronizzazione Realtime con la stanza Supabase.
// MONTATO UNA SOLA VOLTA in App.jsx — NON ripetere in altre schermate.
//
// Responsabilità:
//   1. al mount, se mode==='online' fa lo snapshot iniziale (getRoom) e si iscrive (subscribeToRoom)
//   2. su ogni update, sincronizza lo store e — se non è host — naviga alla phase corrente
//   3. gestisce reconnect con backoff fino a MAX_RECONNECT_ATTEMPTS

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoom, subscribeToRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 3000

// Mappa phase Supabase → path React Router. Per 'game' serve l'activeGame.
const phaseToPath = (phase, state) => {
  switch (phase) {
    case 'lobby':      return '/waiting'
    case 'hub':        return '/hub'
    case 'game':       return state?.activeGame ? `/game/${state.activeGame}` : null
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
  const syncFromRemote = useSession((s) => s.syncFromRemote)
  const showError     = useSession((s) => s.showError)

  const subRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const attemptsRef = useRef(0)
  // Tieni `isHost` aggiornato in ref per usarlo dentro callback async senza
  // riavviare la sub ogni volta che host cambia (le deps dell'effect sono solo [mode, roomCode]).
  const isHostRef = useRef(isHost)
  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])

  useEffect(() => {
    if (mode !== 'online' || !roomCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle')
      return
    }

    let cancelled = false

    const navigateToPhase = (phase, state) => {
      const target = phaseToPath(phase, state)
      if (target && window.location.pathname !== target) navigate(target)
    }

    const handler = ({ phase, state, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('disconnected')
        scheduleReconnect()
        return
      }
      syncFromRemote(state, phase)
      if (!isHostRef.current) navigateToPhase(phase, state)
    }

    const scheduleReconnect = () => {
      if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        showError('connection')
        setStatus('disconnected')
        return
      }
      attemptsRef.current += 1
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
        showError('room_not_found')
        setStatus('disconnected')
        return
      }
      // Snapshot immediato: risolve il join mid-game (il client si vede subito al posto giusto).
      syncFromRemote(room.state, room.phase)
      if (!isHostRef.current) navigateToPhase(room.phase, room.state)

      // Subscribe (rimpiazza eventuale precedente).
      subRef.current?.unsubscribe()
      subRef.current = subscribeToRoom(roomCode, handler)
      attemptsRef.current = 0
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

  return { status }
}
