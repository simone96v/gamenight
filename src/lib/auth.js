// Tutte le operazioni di Auth + profilo utente + storico partite.
// Le pagine UI usano questo modulo + lo store `useAuth`; non chiamano
// supabase.auth direttamente, così il flusso è centralizzato.

import { supabase } from './supabase'
import { getDeviceId } from '../utils/device'

// --- Sessione & user ---

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) return { session: null, error }
  return { session: data.session ?? null, error: null }
}

export const onAuthChange = (handler) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handler({ event, session })
  })
  return () => data?.subscription?.unsubscribe?.()
}

// --- Sign-in / Sign-up ---

// Avvia il flusso OAuth Google. Dopo il consenso, Supabase redirige a `redirectTo`
// con `?code=...` che la libreria scambia per una sessione (detectSessionInUrl: true).
export const signInWithGoogle = async (redirectTo) => {
  const url = redirectTo || (typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: url,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  return { data, error }
}

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  return { user: data?.user ?? null, session: data?.session ?? null, error }
}

export const signUpWithEmail = async ({ email, password, displayName }) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: (displayName || '').trim().slice(0, 24) || 'Player' },
    },
  })
  return { user: data?.user ?? null, session: data?.session ?? null, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Invia email con link "reset password". L'utente clicca il link → atterra su
// `/auth/reset` con un token che supabase-js scambia automaticamente in sessione
// temporanea valida solo per il successivo updateUser({ password }).
export const sendPasswordReset = async (email) => {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset`
    : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  )
  return { error }
}

// Imposta una nuova password per l'utente loggato (sessione temporanea da reset link
// o sessione normale). Lato Supabase, la sessione di reset ha lo scope necessario
// per il solo update password.
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}

// GDPR-friendly account deletion: chiama l'RPC server-side che:
// 1. anonimizza i record `player_name` nei *_scores per il user corrente
// 2. cancella auth.users (cascade → profiles, match_history)
// Dopo l'eliminazione la sessione locale viene invalidata con signOut().
export const deleteMyAccount = async () => {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error }
  // Pulizia sessione locale (anche se il JWT è ora invalido lato server).
  await supabase.auth.signOut()
  return { error: null }
}

// --- Profile ---

export const getProfile = async (userId) => {
  if (!userId) return { profile: null, error: new Error('no_user_id') }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, blob_color, avatar_emoji, locale, linked_device_ids, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { profile: null, error }
  return { profile: data ?? null, error: null }
}

export const updateProfile = async (userId, patch) => {
  if (!userId) return { profile: null, error: new Error('no_user_id') }
  const allowed = {}
  if (typeof patch.display_name === 'string') allowed.display_name = patch.display_name.trim().slice(0, 24)
  if (typeof patch.blob_color === 'string') allowed.blob_color = patch.blob_color
  if (typeof patch.avatar_emoji === 'string') allowed.avatar_emoji = patch.avatar_emoji.slice(0, 8)
  if (typeof patch.locale === 'string') allowed.locale = patch.locale.slice(0, 8)
  if (Object.keys(allowed).length === 0) return { profile: null, error: new Error('no_changes') }

  const { data, error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', userId)
    .select('id, display_name, blob_color, avatar_emoji, locale')
    .maybeSingle()
  return { profile: data ?? null, error }
}

// Collega gli score anonimi del device corrente all'utente loggato.
// Chiamato una volta dopo ogni sign-in. Idempotente.
export const linkDeviceToUser = async () => {
  const { data, error } = await supabase.rpc('link_device_to_user', {
    p_device_id: getDeviceId(),
  })
  if (error) return { ok: false, updated: null, error }
  return { ok: true, updated: data?.updated ?? null, error: null }
}

// --- Stats & match history ---

export const getUserStats = async (userId) => {
  if (!userId) return { stats: null, error: new Error('no_user_id') }
  const { data, error } = await supabase
    .from('user_stats')
    .select('parties_played, solo_played, wins, total_played, best_scores')
    .eq('user_id', userId)
    .maybeSingle()
  return { stats: data ?? null, error }
}

export const recordMatch = async ({
  gameId, mode, role = null, roomCode = null,
  score = null, position = null, playersCount = null, won = null, meta = {},
}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { match: null, error: null }   // guest: niente match_history
  const { data, error } = await supabase
    .from('match_history')
    .insert({
      user_id: user.id,
      game_id: gameId,
      mode,
      role,
      room_code: roomCode,
      score,
      position,
      players_count: playersCount,
      won,
      meta,
    })
    .select('id, played_at')
    .maybeSingle()
  return { match: data ?? null, error }
}

// Arricchisce un array di righe score (con user_id) con i dati del profilo.
// Aggiunge in ogni riga (quando user_id presente) `display_name`, `blob_color`,
// `avatar_emoji`. Per le righe senza user_id (anon/legacy) mantiene il
// `player_name` snapshot già presente in DB.
// Una sola query a `profiles` con `.in('id', [userIds])`.
export const enrichScoresWithProfiles = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  if (userIds.length === 0) return rows

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, blob_color, avatar_emoji')
    .in('id', userIds)
  if (error || !data) return rows

  const byId = new Map(data.map((p) => [p.id, p]))
  return rows.map((r) => {
    const p = r.user_id ? byId.get(r.user_id) : null
    if (!p) return r
    return {
      ...r,
      display_name: p.display_name,
      profile_blob_color: p.blob_color,
      profile_avatar_emoji: p.avatar_emoji,
    }
  })
}

export const listMatchHistory = async ({ limit = 20, gameId = null } = {}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rows: [], error: null }
  let query = supabase
    .from('match_history')
    .select('id, game_id, mode, role, room_code, score, position, players_count, won, played_at, meta')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(limit)
  if (gameId) query = query.eq('game_id', gameId)
  const { data, error } = await query
  return { rows: data ?? [], error }
}
