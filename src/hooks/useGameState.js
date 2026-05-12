// Interfaccia standard che ogni gioco usa per leggere/scrivere il proprio stato.
// Astrae la differenza fra locale e online:
//   - locale: scritture libere
//   - online (host): scritture spinte automaticamente su Supabase (via useSession.setGameState)
//   - online (client): scritture rifiutate, solo lettura. I voti passano per pushVote.

import { useEffect, useRef } from 'react'
import { useSession } from '../stores/useSession'

export const useGameState = (initialState = {}) => {
  const gameState    = useSession((s) => s.gameState)
  const setGameState = useSession((s) => s.setGameState)
  const mode         = useSession((s) => s.mode)
  const isHost       = useSession((s) => s.isHost)

  const canWrite = mode === 'local' || isHost

  // Init una sola volta al mount del componente che chiama l'hook (es. il gioco).
  // Solo host/local: i client aspettano la sync remota e non sovrascrivono mai.
  const initedRef = useRef(false)
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    if (canWrite) setGameState(initialState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateGameState = (partial) => {
    if (!canWrite) return
    setGameState(partial)
  }

  return { gameState, updateGameState, canWrite }
}
