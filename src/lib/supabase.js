// Client Supabase singleton.
// Legge URL e anon key da .env.local (variabili VITE_*).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti in .env.local')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: {
    // Auth persistente: necessario per Google OAuth + email/password.
    // I guest restano tali finché non si autenticano; le RPC che usano device_id
    // continuano a funzionare anche senza sessione.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // gestisce il redirect OAuth (?code=...)
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'gn:auth',
  },
})
