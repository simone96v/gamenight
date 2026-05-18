// useTapShockwave — incapsula la logica "blob tappabile":
// onTap → spawn shockwave (anello che si espande dietro al blob) + cambio
// espressione random temporaneo. Riusato da HomeScreen, GameLobbyLayout e
// LobbyScreen per rendere interattivi tutti i blob/mini-blob.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSfx } from './useSfx'

const REACTIONS = ['happy', 'blink', 'look-left', 'look-right']
const pickReaction = () => REACTIONS[Math.floor(Math.random() * REACTIONS.length)]

export const useTapShockwave = ({ duration = 700 } = {}) => {
  const [tapExpr, setTapExpr] = useState(null)
  const [waves, setWaves] = useState([])
  const resetRef = useRef(null)
  const playSfx = useSfx()

  useEffect(() => () => clearTimeout(resetRef.current), [])

  const removeWave = useCallback((id) => {
    setWaves((w) => w.filter((wv) => wv.id !== id))
  }, [])

  const onTap = useCallback(() => {
    setTapExpr(pickReaction())
    clearTimeout(resetRef.current)
    resetRef.current = setTimeout(() => setTapExpr(null), duration)
    setWaves((w) => [...w, { id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }])
    playSfx('pop', { volume: 0.7 })
  }, [duration, playSfx])

  return { tapExpr, waves, onTap, removeWave }
}
