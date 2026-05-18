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
      numQuestions: 10,
      timerDuration: 15,

      // Tema: 'light' | 'dark'
      theme: 'light',

      // Modalità Trivia "session": 3 round con categorie estratte via wheel.
      // questionsPerRound = quante domande per round (settabile in lobby).
      // totalRounds = quanti round in totale (fissato a 3 per design, ma estendibile).
      triviaSessionRounds: 3,
      triviaQuestionsPerRound: 5,

      // Audio
      sfxEnabled: true,
      sfxVolume: 0.6,           // 0..1
      musicEnabled: true,
      musicVolume: 0.25,         // BGM leggero di sottofondo (volume basso)

      setSfxEnabled: (enabled) => set({ sfxEnabled: !!enabled }),
      toggleSfx: () => set({ sfxEnabled: !get().sfxEnabled }),
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(1, v)) }),
      setMusicEnabled: (enabled) => set({ musicEnabled: !!enabled }),
      toggleMusic: () => set({ musicEnabled: !get().musicEnabled }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),

      setCategory: (category) => set({ category }),
      setIntensity: (intensity) => set({ intensity }),
      setNumQuestions: (n) => set({ numQuestions: n }),
      setTimerDuration: (d) => set({ timerDuration: d }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setTriviaSessionRounds: (n) => set({ triviaSessionRounds: Math.max(1, Math.min(5, n)) }),
      setTriviaQuestionsPerRound: (n) => set({ triviaQuestionsPerRound: Math.max(3, Math.min(15, n)) }),

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
    { name: 'gn:settings', version: 3 },
  ),
)
