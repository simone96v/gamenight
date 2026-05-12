// Preferenze utente: categoria, intensità, giochi attivi, conferma maggiore età.
// Vive in uno store separato da useSession perché ha lifecycle diverso (sopravvive tra partite)
// e perché useSession.buildState() lo include come `settings` nello state Supabase.
//
// Zustand + persist su localStorage chiave 'gn:settings'.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettings = create(
  persist(
    (set, get) => ({
      category: 'gamenight',
      intensity: 'medium',
      activeGames: ['trivia'],
      ageConfirmed: false,

      setCategory: (category) => set({ category }),
      setIntensity: (intensity) => set({ intensity }),

      toggleGame: (gameId) => {
        const list = get().activeGames
        const next = list.includes(gameId)
          ? list.filter((g) => g !== gameId)
          : [...list, gameId]
        set({ activeGames: next })
      },

      confirmAge: () => set({ ageConfirmed: true }),
      resetAgeConfirmation: () => set({ ageConfirmed: false }),
    }),
    { name: 'gn:settings' },
  ),
)
