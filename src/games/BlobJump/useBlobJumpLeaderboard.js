// Hook + helper per la classifica globale Blob Jump.
// Persistenza: Supabase table public.blobjump_scores (one row per device, best score).
// Upsert pattern: insert con on-conflict che tiene il GREATEST(score, excluded.score).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getDeviceId } from '../../utils/device'
import { enrichScoresWithProfiles } from '../../lib/auth'

const TABLE = 'blobjump_scores'
const TOP_LIMIT = 20

/**
 * Submit del best score: scrittura SOLO via RPC server-side `submit_score`.
 * Le policy RLS bloccano upsert/insert/update diretti da anon. La RPC fa
 * sanity check (range, rate limit 2s, plausibilità ≤ prev*3+50) e fa
 * upsert con GREATEST. Ritorna { promoted, newBest, previousScore }.
 */
export async function submitBlobJumpScore({ score, playerName, color, source = 'solo' }) {
  if (!Number.isFinite(score) || score < 0) return { error: 'invalid_score' }
  const { data, error } = await supabase.rpc('submit_score', {
    p_game: 'blobjump',
    p_device_id: getDeviceId(),
    p_player_name: (playerName || 'Anonimo').toString().slice(0, 24).trim() || 'Anonimo',
    p_score: Math.floor(score),
    p_color: color ?? null,
    p_source: source,
  })
  if (error) return { error: error.message }
  return {
    promoted: !!data?.promoted,
    newBest: data?.newBest ?? score,
    previousScore: data?.previousScore ?? -1,
  }
}

/** Top N giocatori ordinati per score desc, tie-break per updated_at asc (chi l'ha fatto prima). */
export async function fetchTopBlobJumpScores(limit = TOP_LIMIT) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('device_id, user_id, player_name, score, color, updated_at')
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit)
  if (error) return { rows: [], error: error.message }
  const enriched = await enrichScoresWithProfiles(data || [])
  return { rows: enriched }
}

/**
 * Rank globale (1-based) del proprio device. Conta quanti row hanno score più alto del nostro.
 * Se il device non ha mai submitted, ritorna { rank: null, total }.
 */
export async function fetchPlayerRank() {
  const deviceId = getDeviceId()
  const { data: mine } = await supabase
    .from(TABLE)
    .select('score')
    .eq('device_id', deviceId)
    .maybeSingle()

  const { count: total } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })

  if (!mine) return { rank: null, total: total ?? 0, score: null }

  const { count: above } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .gt('score', mine.score)

  return {
    rank: (above ?? 0) + 1,
    total: total ?? 0,
    score: mine.score,
  }
}

/**
 * Hook React: carica top + posizione locale.
 * Chiama `refresh()` per ricaricare (es. dopo un nuovo submit).
 */
export function useBlobJumpLeaderboard({ enabled = true } = {}) {
  const [top, setTop] = useState([])
  const [me, setMe] = useState({ rank: null, total: 0, score: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [{ rows, error: topErr }, rank] = await Promise.all([
      fetchTopBlobJumpScores(),
      fetchPlayerRank(),
    ])
    if (topErr) setError(topErr)
    setTop(rows)
    setMe(rank)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
  }, [enabled, refresh])

  return { top, me, deviceId: getDeviceId(), loading, error, refresh }
}
