// Hook + helper per la classifica globale di Flappy Blob.
// Persistenza: Supabase table public.flappyblob_scores (one row per device, best score).
// Stesso pattern di useBlobJumpLeaderboard.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getDeviceId } from '../../utils/device'

const TABLE = 'flappyblob_scores'
const TOP_LIMIT = 20

// Vedi nota in useSnakeLeaderboard: scrittura solo via RPC `submit_score`.
export async function submitFlappyBlobScore({ score, playerName, color, source = 'solo' }) {
  if (!Number.isFinite(score) || score < 0) return { error: 'invalid_score' }
  const { data, error } = await supabase.rpc('submit_score', {
    p_game: 'flappyblob',
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

export async function fetchTopFlappyBlobScores(limit = TOP_LIMIT) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('device_id, player_name, score, color, updated_at')
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit)
  if (error) return { rows: [], error: error.message }
  return { rows: data || [] }
}

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

export function useFlappyBlobLeaderboard({ enabled = true } = {}) {
  const [top, setTop] = useState([])
  const [me, setMe] = useState({ rank: null, total: 0, score: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [{ rows, error: topErr }, rank] = await Promise.all([
      fetchTopFlappyBlobScores(),
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
