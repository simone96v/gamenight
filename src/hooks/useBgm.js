// useBgm — orchestratore globale del BGM in funzione di:
//   1. musicEnabled / musicVolume da useSettings
//   2. currentPath (route) — alcuni path attivano il loop, altri lo silenziano
//
// Da chiamare UNA VOLTA in App.jsx (mountato a livello root).

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { playBgm, stopBgm, setBgmVolume } from '../utils/audio'
import { useSettings } from '../stores/useSettings'

// Path su cui il BGM "lobby" è attivo. Tutto il resto (gameplay, test) → silent.
const LOBBY_PREFIXES = [
  '/',
  '/mode', '/create', '/join', '/lobby',
  '/games', '/solo', '/solo/games', '/hub', '/category',
  '/trivia-lobby', '/mappa-lobby', '/blobjump-lobby',
  '/emojiquiz-lobby', '/scramble-lobby', '/catchblob-lobby',
]

function shouldPlayLobbyBgm(pathname) {
  if (pathname === '/') return true
  return LOBBY_PREFIXES.some((p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/')))
}

export const useBgm = () => {
  const { pathname } = useLocation()
  const enabled = useSettings((s) => s.musicEnabled)
  const volume = useSettings((s) => s.musicVolume)

  // Start/stop in base a enabled + path.
  useEffect(() => {
    if (!enabled) {
      stopBgm()
      return
    }
    if (shouldPlayLobbyBgm(pathname)) {
      playBgm('lobby', { volume })
    } else {
      stopBgm()
    }
  }, [enabled, pathname, volume])

  // Update volume immediato sullo slider (senza re-trigger del fade).
  useEffect(() => {
    if (enabled) setBgmVolume(volume)
  }, [volume, enabled])
}
