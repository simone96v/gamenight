// useSfx — hook che incapsula playSfx + rispetto delle preferenze utente
// (sfxEnabled, sfxVolume) da useSettings. Restituisce una funzione stabile
// con `useCallback` così è safe per dependency array.

import { useCallback } from 'react'
import { playSfx as raw } from '../utils/audio'
import { useSettings } from '../stores/useSettings'

export const useSfx = () => {
  const enabled = useSettings((s) => s.sfxEnabled)
  const volume = useSettings((s) => s.sfxVolume)

  return useCallback((name, { volume: vol } = {}) => {
    if (!enabled) return false
    return raw(name, { volume: vol ?? volume })
  }, [enabled, volume])
}
