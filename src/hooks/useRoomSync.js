// Hook di sincronizzazione Realtime con la stanza Supabase.
// MONTATO UNA SOLA VOLTA in App.jsx — NON ripetere in altre schermate.
//
// Responsabilità:
//   1. al mount, se mode==='online' fa lo snapshot iniziale (getRoom) e si iscrive (subscribeToRoom)
//   2. su ogni update, sincronizza lo store e — se non è host — naviga alla phase corrente
//   3. gestisce reconnect con backoff fino a MAX_RECONNECT_ATTEMPTS
//   4. se la phase diventa 'closed' (host ha chiuso), mostra errore e riporta alla home
//   5. se il reconnect fallisce dopo tutti i tentativi, riporta alla home

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoom, subscribeToRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 3000
const REDIRECT_DELAY_MS = 2500

const phaseToPath = (phase) => {
  switch (phase) {
    case 'lobby':       return '/lobby'
    case 'game_voting': return '/games'
    case 'trivia_lobby': return '/trivia-lobby'
    case 'countdown':   return '/game/trivia'
    case 'question':    return '/game/trivia'
    case 'reveal':      return '/game/trivia'
    case 'final':       return '/game/trivia'
    case 'mappa_lobby':        return '/mappa-lobby'
    case 'mappa_countdown':   return '/game/mappa'
    case 'mappa_question':    return '/game/mappa'
    case 'mappa_reveal':      return '/game/mappa'
    case 'mappa_final':       return '/game/mappa'
    case 'sentenza_lobby':          return '/sentenza-lobby'
    case 'sentenza_countdown':      return '/game/sentenza'
    case 'sentenza_judging_setup':  return '/game/sentenza'
    case 'sentenza_selection':      return '/game/sentenza'
    case 'sentenza_judging':        return '/game/sentenza'
    case 'sentenza_reveal':         return '/game/sentenza'
    case 'sentenza_final':          return '/game/sentenza'
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
  const resetSession  = useSession((s) => s.resetSession)

  const subRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
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
      setStatus('idle')
      return
    }

    let cancelled = false

    const navigateToPhase = (phase) => {
      if (awaitingRef.current) return
      const target = phaseToPath(phase)
      if (target && window.location.pathname !== target) navigate(target)
    }

    const kickToHome = (errorType) => {
      if (cancelled) return
      showError(errorType)
      subRef.current?.unsubscribe()
      subRef.current = null
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = setTimeout(() => {
        if (cancelled) return
        resetSession()
        navigate('/', { replace: true })
      }, REDIRECT_DELAY_MS)
    }

    const handler = ({ phase, state, questionStartedAt, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('disconnected')
        scheduleReconnect()
        return
      }

      // Host ha chiuso il party
      if (phase === 'closed') {
        if (!isHostRef.current) {
          kickToHome('host_left')
        }
        return
      }

      syncFromRemote(state, phase, questionStartedAt)
      navigateToPhase(phase)
    }

    const scheduleReconnect = () => {
      if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        if (!isHostRef.current) {
          kickToHome('connection_lost')
        } else {
          showError('connection')
        }
        setStatus('disconnected')
        return
      }
      attemptsRef.current += 1
      showError('connection')
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
        if (!isHostRef.current) {
          kickToHome('room_not_found')
        } else {
          showError('room_not_found')
        }
        setStatus('disconnected')
        return
      }

      // Room was closed while we were reconnecting
      if (room.phase === 'closed') {
        if (!isHostRef.current) {
          kickToHome('host_left')
        }
        return
      }

      syncFromRemote(room.state, room.phase, room.question_started_at)
      navigateToPhase(room.phase)

      subRef.current?.unsubscribe()
      subRef.current = subscribeToRoom(roomCode, handler)
      attemptsRef.current = 0
      setStatus('connected')
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimerRef.current)
      clearTimeout(redirectTimerRef.current)
      subRef.current?.unsubscribe()
      subRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roomCode])

  return { status }
}
