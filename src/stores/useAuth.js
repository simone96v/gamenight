// Stato globale di Auth — sessione + profilo utente.
// Non persiste lato Zustand: la sessione è già persistita da supabase-js
// (storageKey 'gn:auth') e idratata all'avvio da bootstrap().

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getProfile, linkDeviceToUser, onAuthChange } from '../lib/auth'

// Stati possibili di `status`:
//   'idle'         → mai inizializzato (prima dell'avvio)
//   'loading'      → bootstrap in corso (chiamata getSession iniziale)
//   'guest'        → nessuna sessione attiva (utente anonimo)
//   'authenticated'→ sessione valida + profilo caricato
//   'error'        → bootstrap o profilo falliti
export const useAuth = create((set, get) => ({
  status: 'idle',
  user: null,        // auth.users row (id, email, user_metadata, ...)
  profile: null,     // public.profiles row
  error: null,

  isAuthenticated: () => get().status === 'authenticated',
  isGuest: () => get().status === 'guest',

  // Idratazione iniziale: legge sessione da storage, carica profilo, registra listener.
  // Chiamare una volta sola all'avvio dell'app (vedi main.jsx).
  bootstrap: async () => {
    const s = get()
    if (s.status !== 'idle') return
    set({ status: 'loading' })

    const { data: { session } } = await supabase.auth.getSession()
    await get()._hydrateFromSession(session)

    // Listener globale: reagisce a SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED.
    onAuthChange(async ({ event, session: nextSession }) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await get()._hydrateFromSession(nextSession)
        // Migrazione one-shot: device → user. Idempotente, può girare ogni sign-in.
        if (event === 'SIGNED_IN') {
          linkDeviceToUser().catch(() => { /* best-effort */ })
        }
      } else if (event === 'SIGNED_OUT') {
        set({ status: 'guest', user: null, profile: null, error: null })
      }
    })
  },

  // Internal: estrae user dalla sessione e carica profilo.
  _hydrateFromSession: async (session) => {
    if (!session?.user) {
      set({ status: 'guest', user: null, profile: null, error: null })
      return
    }
    const user = session.user
    const { profile, error } = await getProfile(user.id)
    if (error) {
      set({ status: 'error', user, profile: null, error: error.message })
      return
    }
    set({ status: 'authenticated', user, profile, error: null })
  },

  // Aggiorna lo store dopo un updateProfile riuscito.
  setProfile: (profile) => set({ profile }),

  // Forza un refresh manuale del profilo (es. dopo un update server-side).
  refreshProfile: async () => {
    const u = get().user
    if (!u) return
    const { profile } = await getProfile(u.id)
    if (profile) set({ profile })
  },
}))
