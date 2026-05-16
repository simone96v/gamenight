// Tutte le operazioni di lettura/scrittura sulla tabella `rooms` di Supabase.
// I client (non-host) NON devono chiamare `pushRoom` — l'unica eccezione è `pushVote`.

import { supabase } from './supabase'
import { getDeviceId } from '../utils/device'
import { pickColor } from '../utils/colors'

const CODE_ALPHABET = 'BCDFGHJKLMNPRSTVWX'
const CODE_LENGTH = 4
const MAX_ATTEMPTS = 10
const MAX_PLAYERS = 8

const randomCode = () => {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

// Genera un codice univoco di 4 lettere. Tenta fino a MAX_ATTEMPTS volte.
export const generateCode = async () => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode()
    const { data, error } = await supabase
      .from('rooms')
      .select('code')
      .eq('code', code)
      .maybeSingle()
    if (error) return { code: null, error }
    if (!data) return { code, error: null }
  }
  return { code: null, error: new Error('generate_code_exhausted') }
}

// Crea una nuova stanza con lo stato iniziale fornito.
// `initialState` è l'oggetto JSONB completo (players, currentIdx, gameState, ecc).
export const createRoom = async (initialState) => {
  const { code, error: genErr } = await generateCode()
  if (genErr || !code) return { code: null, error: genErr ?? new Error('no_code') }

  const { error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: getDeviceId(),
      phase: 'lobby',
      state: initialState,
    })
  if (error) return { code: null, error }
  return { code, error: null }
}

// Snapshot singolo. Usato dal client al join.
export const getRoom = async (code) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('code, host_id, phase, state, question_started_at, updated_at')
    .eq('code', code)
    .maybeSingle()
  if (error) return { room: null, error }
  if (!data) return { room: null, error: new Error('room_not_found') }
  return { room: data, error: null }
}

// Scrive lo stato corrente sulla stanza. Solo host.
export const pushRoom = async (code, phase, state, questionStartedAt) => {
  const payload = { phase, state, updated_at: new Date().toISOString() }
  if (questionStartedAt !== undefined) payload.question_started_at = questionStartedAt
  const { error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('code', code)
  return { error }
}

// Subscribe ai cambi via Realtime. Ritorna oggetto con .unsubscribe().
// Passa anche question_started_at per il timer server-derived.
export const subscribeToRoom = (code, onUpdate) => {
  const channel = supabase
    .channel(`room:${code}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
      (payload) => {
        onUpdate({
          phase: payload.new.phase,
          state: payload.new.state,
          questionStartedAt: payload.new.question_started_at ?? null,
          error: null,
        })
      },
    )
    .on('system', { event: '*' }, (payload) => {
      // Eventuale segnale di disconnessione: propaga errore.
      if (payload?.status === 'CHANNEL_ERROR' || payload?.status === 'TIMED_OUT') {
        onUpdate({ phase: null, state: null, error: new Error('channel_' + payload.status) })
      }
    })
    .subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

// Aggiunge un giocatore alla stanza tramite RPC atomico (FOR UPDATE).
// Elimina la race-condition fra join simultanei.
// `isHost` marca il giocatore come host (solo per il creatore della stanza).
export const addPlayerToRoom = async (code, { id, name, color: chosenColor, isHost = false, accessory = null }) => {
  const { room, error: getErr } = await getRoom(code)
  if (getErr || !room) return { player: null, error: getErr ?? new Error('room_not_found') }

  const state = room.state ?? {}
  const players = Array.isArray(state.players) ? state.players : []
  if (players.length >= MAX_PLAYERS) return { player: null, error: new Error('room_full') }

  const color = chosenColor || pickColor(players.length)

  const { error } = await supabase.rpc('add_player', {
    p_code: code,
    p_id: id,
    p_name: name,
    p_color: color,
    p_is_host: !!isHost,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('room_full')) return { player: null, error: new Error('room_full') }
    if (msg.includes('room_not_found')) return { player: null, error: new Error('room_not_found') }
    return { player: null, error }
  }

  // Patch extra fields (accessory) into the player object in room state.
  // The RPC only stores core fields; we merge extras via a state update.
  if (accessory) {
    const { room: updated } = await getRoom(code)
    if (updated) {
      const updState = updated.state ?? {}
      const updPlayers = (updState.players || []).map((p) =>
        p.id === id ? { ...p, accessory } : p,
      )
      await supabase
        .from('rooms')
        .update({ state: { ...updState, players: updPlayers }, updated_at: new Date().toISOString() })
        .eq('code', code)
    }
  }

  const player = { id, name, color, score: 0, is_host: !!isHost, is_ready: false, accessory }
  return { player, error: null }
}

// --- RPC per il flusso host-controlled ---

// Invia risposta del giocatore. Il server calcola correttezza e punteggio.
// Auto-reveal quando tutti hanno risposto.
export const rpcSubmitAnswer = async (roomCode, playerId, round, chosenIndex) => {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_code: roomCode,
    p_player_id: playerId,
    p_round: round,
    p_chosen_index: chosenIndex,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Reveal idempotente allo scadere del timer.
export const rpcTimeoutReveal = async (roomCode, round) => {
  const { data, error } = await supabase.rpc('timeout_reveal', {
    p_code: roomCode,
    p_round: round,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Avvia il gioco: genera countdown → poi begin_round avvia la prima domanda.
// `timerDuration` (sec) viene salvato in state per scoring server-side.
// `resetScores` (default true) determina se azzerare punteggi+aggregate
// (round singolo o primo round di sessione) o mantenerli (round successivi
// nella session mode di Trivia).
export const rpcStartGame = async (roomCode, deck, timerDuration = 15, resetScores = true) => {
  const { data, error } = await supabase.rpc('start_game', {
    p_code: roomCode,
    p_deck: deck,
    p_timer_duration: timerDuration,
    p_reset_scores: resetScores,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Transizione countdown → question (idempotente).
export const rpcBeginRound = async (roomCode) => {
  const { data, error } = await supabase.rpc('begin_round', {
    p_code: roomCode,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Host avanza il gioco: reveal → prossima domanda (o final), final → lobby.
export const rpcHostAdvance = async (roomCode, playerId) => {
  const { data, error } = await supabase.rpc('host_advance', {
    p_code: roomCode,
    p_player_id: playerId,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// LEGACY: vecchio pushVote — mantenuto per compatibilità ma preferire rpcSubmitAnswer.
export const pushVote = async (roomCode, playerId, answerIndex) => {
  const { error } = await supabase.rpc('submit_vote', {
    p_code: roomCode,
    p_player: playerId,
    p_answer: answerIndex,
  })
  return { error }
}

// --- RPC per giochi sync (NeverHaveI) ---

// Inizializza lo state minimo per il gioco scelto e cambia phase.
// Chiamato dall'host quando il voting in /games si conclude.
export const rpcInitGame = async (roomCode, gameId, phase) => {
  const { data, error } = await supabase.rpc('init_game', {
    p_code: roomCode,
    p_game_id: gameId,
    p_phase: phase,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Patch atomico dello state. Solo host autorizzato. Usato per la maggior parte
// delle mutazioni nei giochi sync (gira ruota, pesca carta, reset ecc).
export const rpcUpdateGameState = async (roomCode, playerId, patch) => {
  const { data, error } = await supabase.rpc('update_game_state', {
    p_code: roomCode,
    p_player_id: playerId,
    p_patch: patch,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Patch atomico dello state che qualunque player può fare (non solo host).
// Usato es. in Truth/Dare quando il player estratto sceglie verità o obbligo.
export const rpcPlayerUpdate = async (roomCode, playerId, patch) => {
  const { data, error } = await supabase.rpc('player_update_game_state', {
    p_code: roomCode,
    p_player_id: playerId,
    p_patch: patch,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

// Voto atomico: mergia il voto nel campo JSONB senza sovrascrivere gli altri.
// Risolve la race-condition fra voti simultanei di client diversi.
export const rpcCastVote = async (roomCode, field, playerId, value) => {
  const { error } = await supabase.rpc('cast_vote', {
    p_code: roomCode,
    p_field: field,
    p_player_id: playerId,
    p_value: value,
  })
  return { error }
}

// Chiude la stanza: setta phase='closed' così tutti i client vengono notificati.
export const closeRoom = async (code) => {
  const { error } = await supabase
    .from('rooms')
    .update({ phase: 'closed', updated_at: new Date().toISOString() })
    .eq('code', code)
  return { error }
}

// Elimina la stanza. Chiamato su "Nuova serata" dallo scoreboard (host).
export const deleteRoom = async (code) => {
  const { error } = await supabase.from('rooms').delete().eq('code', code)
  return { error }
}
