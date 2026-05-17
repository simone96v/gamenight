// Hook + helper per la classifica globale Catch The Blob.
// Persistenza: Supabase table public.catchblob_scores (one row per device, best score).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getDeviceId } from '../../utils/device'

const TABLE = 'catchblob_scores'
const TOP_LIMIT = 20

/**
 * Upsert del best score per device. Aggiorna nome+colore;
 * sovrascrive lo score solo se il nuovo è maggiore.
 */
export async function submitCatchBlobScore({ score, playerName, color, source = 'solo' }) {
  if (!Number.isFinite(score) || score < 0) return { error: 'invalid_score' }
  const deviceId = getDeviceId()
  const cleanName = (playerName || 'Anonimo').toString().slice(0, 24).trim() || 'Anonimo'

  let previousScore = -1
  try {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('score')
      .eq('device_id', deviceId)
      .maybeSingle()
    if (existing) previousScore = existing.score ?? -1
  } catch {/* ignora */}

  const newBest = Math.max(previousScore, score)
  const promoted = score > previousScore

  const { error } = await supabase
    .from(TABLE)
    .upsert({
      device_id: deviceId,
      player_name: cleanName,
      score: newBest,
      color: color ?? null,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' })

  if (error) return { error: error.message }
  return { promoted, newBest, previousScore }
}

export async function fetchTopCatchBlobScores(limit = TOP_LIMIT) {
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

export function useCatchBlobLeaderboard({ enabled = true } = {}) {
  const [top, setTop] = useState([])
  const [me, setMe] = useState({ rank: null, total: 0, score: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [{ rows, error: topErr }, rank] = await Promise.all([
      fetchTopCatchBlobScores(),
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
